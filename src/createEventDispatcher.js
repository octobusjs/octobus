import EventEmitter from 'events';
import { validateEvent, createOneTimeCallable, compose } from './utils';
import HandlersMap from './HandlersMap';

export default (options = {}) => {
  const { delimiter, emitter, middlewares } = {
    delimiter: '.',
    emitter: new EventEmitter(),
    middlewares: [],
    ...options,
  };

  const store = {
    eventsMap: new HandlersMap(),
    matchersMap: new HandlersMap(),
  };

  const on = (...args) => emitter.on(...args);
  const emit = (event, ...args) => emitter.emit(event, ...args.concat([{ dispatch, lookup }]));
  const onBefore = (event, ...args) => on(`before:${event}`, ...args);
  const onAfter = (event, ...args) => on(`after:${event}`, ...args);
  const emitBefore = (event, ...args) => emit(`before:${event}`, ...args);
  const emitAfter = (event, ...args) => emit(`after:${event}`, ...args);

  emitter.on('error', () => {});

  const subscribe = (event, handler, priority) => {
    if (typeof handler !== 'function') {
      throw new Error(`
        Event handler for ${event.toString()} has to be a function (got ${typeof handler} instead)!
      `);
    }

    event = validateEvent(event, delimiter); // eslint-disable-line no-param-reassign
    const map = event instanceof RegExp ? store.matchersMap : store.eventsMap;

    map.add(event, handler, priority);

    emit('subscribed', event, handler);

    return () => unsubscribe(event, handler);
  };

  const subscribeMap = (prefix, map) => (
    Object.keys(map).reduce((acc, method) => {
      const event = `${prefix}${delimiter}${method}`;
      const handler = map[method];
      subscribe(event, handler);

      return Object.assign(acc, {
        [method]: () => unsubscribe(event, handler),
      });
    }, {})
  );

  const unsubscribe = (event, handler = null) => {
    store.matchersMap.remove(event, handler);
    store.eventsMap.remove(event, handler);

    emit('unsubscribed', event, handler);
  };

  const runMiddlewares = (...args) => compose(...middlewares.reverse())(...args);

  const dispatch = (event, params, done) => {
    const res = runMiddlewares({ event, params });
    event = validateEvent(res.event, delimiter); // eslint-disable-line no-param-reassign
    params = res.params; // eslint-disable-line no-param-reassign

    if (typeof event !== 'string') {
      throw new Error(
        `You can only dispatch events of type string and array (got ${typeof event} instead).`
      );
    }

    const handlers = getEventHandlersMatching(event);

    if (!handlers.length) {
      return Promise.reject(new Error(`No handlers registered for the ${event} event.`));
    }

    emitBefore(event, { params, dispatch, lookup });
    return cascadeHandlers(handlers, params, event).then((result) => {
      emitAfter(event, { params, result, dispatch, lookup });

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
        return (params) => dispatch(`${path}${delimiter}${methodName}`, params);
      },
    })
  );

  const getEventHandlersMatching = (event) => {
    let handlers = [];

    for (const matcher of store.matchersMap.keys()) {
      if (matcher.test(event)) {
        handlers.unshift(...store.matchersMap.getByPriority(matcher));
      }
    }

    if (store.eventsMap.has(event)) {
      handlers = handlers.concat(store.eventsMap.getByPriority(event));
    }

    return handlers;
  };

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
      dispatch,
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
