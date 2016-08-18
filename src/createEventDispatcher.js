import EventEmitter from 'events';
import { createOneTimeCallable, compose } from './utils';
import HandlersMap from './HandlersMap';
import Event from './Event';

export default (options = {}) => {
  const { emitter, middlewares } = {
    emitter: new EventEmitter(),
    middlewares: [],
    ...options,
  };

  const handlersMap = new HandlersMap();
  const matchers = [];

  const on = (...args) => emitter.on(...args);
  const emit = (event, ...args) => emitter.emit(`${event}`, ...args.concat([{ dispatch, lookup }]));
  const onBefore = (event, ...args) => on(`before:${event}`, ...args);
  const onAfter = (event, ...args) => on(`after:${event}`, ...args);
  const emitBefore = (event, ...args) => emit(`before:${event}`, ...args);
  const emitAfter = (event, ...args) => emit(`after:${event}`, ...args);

  emitter.on('error', () => {});

  const addMatcher = (matcher) => {
    const existingMatcher = matchers.find((_matcher) => _matcher.toString() === matcher.toString());
    if (!existingMatcher) {
      matchers.push(matcher);
    }
  };

  const subscribe = (eventIdentifier, handler, priority) => {
    eventIdentifier = Event.normalize(eventIdentifier); // eslint-disable-line no-param-reassign

    if (typeof handler !== 'function') {
      throw new Error(`
        Event handler for ${eventIdentifier} has to be a function (got ${typeof handler} instead)!
      `);
    }

    addMatcher(eventIdentifier);

    handlersMap.set(eventIdentifier.toString(), handler, priority);

    emit('subscribed', eventIdentifier, handler);

    return () => unsubscribe(eventIdentifier, handler);
  };

  const subscribeMap = (prefix, map) => (
    Object.keys(map).reduce((acc, method) => {
      const eventIdentifier = `${prefix}.${method}`;
      const handler = map[method];
      subscribe(eventIdentifier, handler);

      return Object.assign(acc, {
        [method]: () => unsubscribe(eventIdentifier, handler),
      });
    }, {})
  );

  const unsubscribe = (eventIdentifier, handler = null) => {
    handlersMap.delete(eventIdentifier.toString(), handler);
    emit('unsubscribed', eventIdentifier, handler);
  };

  const runMiddlewares = (...args) => compose(...middlewares.reverse())(...args);

  const dispatch = (eventOrIdentifier, params, done) => {
    const event = Event.from(eventOrIdentifier);
    const res = runMiddlewares({ event, params });
    params = res.params; // eslint-disable-line no-param-reassign

    const handlers = getEventHandlersMatching(event);

    if (!handlers.length) {
      return Promise.reject(new Error(`No handlers registered for the ${event} event.`));
    }

    emitBefore(event, { params, dispatch, lookup, event });
    return cascadeHandlers(handlers, params, event).then((result) => {
      emitAfter(event, { params, result, dispatch, lookup, event });

      return done ? done(null, result) : result;
    }, (err) => {
      if (done) {
        return done(err);
      }

      throw err;
    });
  };

  const lookup = (path) => (
    new Proxy({}, {
      get(target, methodName) {
        return (params) => dispatch(`${path}.${methodName}`, params);
      },
    })
  );

  const getEventHandlersMatching = (event) => (
    matchers
      .filter((matcher) => event.isMatch(matcher))
      .reduce((acc, matcher) => {
        acc.unshift(...handlersMap.getByPriority(matcher.toString()));
        return acc;
      }, [])
  );

  const runHandler = (handler, args) => {
    const { onError, ...restArgs } = args;
    let resolve;
    let reject;

    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    const handleResult = createOneTimeCallable((err, result) => {
      if (err) {
        onError(err);
        reject(err);
      } else {
        resolve(result);
      }
    }, 'The result was already handled!');

    const reply = (value) => {
      const err = value instanceof Error ? value : null;
      handleResult(err, value);
    };

    try {
      const result = handler({
        ...restArgs,
        reply,
      }, handleResult);

      if (result !== undefined) {
        handleResult(null, result);
      }
    } catch (err) {
      handleResult(err);
    }

    return promise;
  };

  const cascadeHandlers = (handlers, params, event) => {
    if (!handlers.length) {
      return Promise.resolve(params);
    }

    const handler = handlers.shift();

    const next = (nextParams) => cascadeHandlers(handlers, nextParams, event);

    const onError = (err) => emitter.emit('error', err);

    return runHandler(handler, {
      event,
      params,
      next,
      dispatch: (...args) => dispatch(Event.from(args[0], event), ...args.slice(1)),
      lookup,
      emit,
      emitBefore,
      emitAfter,
      onError,
    });
  };

  return {
    emit, emitBefore, emitAfter, on, onBefore, onAfter,
    dispatch, subscribe, unsubscribe, subscribeMap, lookup,
  };
};
