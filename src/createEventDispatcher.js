import set from 'lodash/set';
import get from 'lodash/get';
import EventEmitter from 'events';
import { validateEvent, applyConfig, runHandler } from './utils';
import HandlersMap from './HandlersMap';

export default (options = {}) => {
  const { delimiter, emitter } = {
    delimiter: '.',
    emitter: new EventEmitter(),
    ...options,
  };

  const store = {
    eventsMap: new HandlersMap(),
    matchersMap: new HandlersMap(),
    eventsTree: {},
    proxies: {},
  };

  const on = (...args) => emitter.on(...args);
  const emit = (event, ...args) => emitter.emit(event, ...args.concat([{ dispatch, lookup }]));
  const onBefore = (event, ...args) => on(`before:${event}`, ...args);
  const onAfter = (event, ...args) => on(`after:${event}`, ...args);
  const emitBefore = (event, ...args) => emit(`before:${event}`, ...args);
  const emitAfter = (event, ...args) => emit(`after:${event}`, ...args);

  emitter.on('error', () => {});

  const subscribe = (event, fn, config = {}) => {
    if (typeof fn !== 'function') {
      throw new Error(`
        Event handler for ${event.toString()} has to be a function (got ${typeof fn} instead)!
      `);
    }

    const { priority } = config;
    event = validateEvent(event, delimiter); // eslint-disable-line no-param-reassign

    const handler = applyConfig(fn, config);

    if (event instanceof RegExp) {
      store.matchersMap.add(event, handler, priority);
    }

    if (typeof event === 'string') {
      store.eventsMap.add(event, handler, priority);
      set(store.eventsTree, event, store.eventsMap.get(event));
    }

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

  const dispatch = (event, params, done) => {
    event = validateEvent(event, delimiter); // eslint-disable-line no-param-reassign

    if (typeof event !== 'string') {
      throw new Error(
        `You can only dispatch events of type string and array (got ${typeof event} instead).`
      );
    }

    let subscribers;

    if (store.proxies[event]) {
      const { targetEvent, paramsTransformer } = store.proxies[event];
      subscribers = getEventSubscribersMatching(targetEvent);
      params = paramsTransformer(params); // eslint-disable-line no-param-reassign
    } else {
      subscribers = getEventSubscribersMatching(event);
    }

    if (!subscribers.length) {
      return Promise.reject(new Error(`No subscribers registered for the ${event} event.`));
    }

    emitBefore(event, params, { dispatch, lookup });
    return cascadeSubscribers(subscribers, params).then((result) => {
      emitAfter(event, result, { dispatch, lookup });

      return done ? done(null, result) : result;
    }, (err) => {
      if (done) {
        return done(err);
      }

      throw err;
    });
  };

  const proxy = (sourceEvent, targetEvent, paramsTransformer = (i) => i) => {
    store.proxies[sourceEvent] = { targetEvent, paramsTransformer };
  };

  const lookup = (path) => {
    const methods = get(store.eventsTree, path, {});

    return Object.keys(methods).reduce((acc, methodName) => (
      Object.assign(acc, {
        [methodName]: (params) => dispatch(`${path}${delimiter}${methodName}`, params),
      })
    ), {});
  };

  const getEventSubscribersMatching = (event) => {
    let subscribers = [];

    for (const matcher of store.matchersMap.keys()) {
      if (matcher.test(event)) {
        subscribers.unshift(...store.matchersMap.getByPriority(matcher));
      }
    }

    if (store.eventsMap.has(event)) {
      subscribers = subscribers.concat(store.eventsMap.getByPriority(event));
    }

    return subscribers;
  };

  const cascadeSubscribers = (subscribers, params) => {
    if (!subscribers.length) {
      return Promise.resolve(params);
    }

    const handler = subscribers.shift();

    const next = (nextParams) => cascadeSubscribers(subscribers, nextParams);

    const onError = (err) => emitter.emit('error', err);

    return runHandler(handler, {
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
    dispatch, subscribe, unsubscribe, subscribeMap, lookup, proxy,
  };
};
