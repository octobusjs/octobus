import { set, get } from 'lodash';
import Joi from 'joi';
import EventEmitter from 'events';

const RESTRICTED_EVENTS = ['error', 'subscribe', 'unsubscribe'];

const validateEvent = (event, delimiter) => {
  Joi.assert(event, [
    Joi.string().regex(/^([A-Za-z0-9]+\.?)+$/).invalid(RESTRICTED_EVENTS),
    Joi.array().min(1).items(Joi.string()),
    Joi.object().type(RegExp)
  ]);

  if (Array.isArray(event)) {
    return event.map((ev) => validateEvent(ev, delimiter)).join(delimiter);
  }

  if (typeof event === 'string') {
    return event.trim();
  }

  return event;
};

const defaultOptions = {
  delimiter: '.',

  createEventEmitter() {
    const emitter = new EventEmitter();
    emitter.on('error', () => {});
    return emitter;
  },

  processParams(params, config = {}) {
    const { defaultParams, schema } = config;
    let finalParams = params;

    if (defaultParams) {
      finalParams = Object.assign({}, defaultParams, params);
    }

    if (schema) {
      finalParams = Joi.attempt(finalParams, schema);
    }

    return finalParams;
  }
};

export default (_options = {}) => {
  const options = Object.assign({}, defaultOptions, _options);
  const { delimiter, processParams, createEventEmitter } = options;

  const store = {
    eventsMap: {},
    eventsTree: {},
    matchers: [],
    matchersMap: {}
  };

  const emitter = createEventEmitter();
  const on = (...args) => emitter.on(...args);
  const emit = (event, ...args) => emitter.emit(event, ...[args.concat([{ dispatch, lookup }])]);
  const onBefore = (event, ...args) => on(`before:${event}`, ...args);
  const onAfter = (event, ...args) => on(`after:${event}`, ...args);
  const emitBefore = (event, ...args) => emit(`before:${event}`, ...args);
  const emitAfter = (event, ...args) => emit(`after:${event}`, ...args);

  const subscribe = (event, handler, config = {}) => {
    if (typeof handler !== 'function') {
      throw new Error(`
        Event handler for ${event.toString()} has to be a function (got ${typeof handler} instead)!
      `);
    }

    event = validateEvent(event, delimiter); // eslint-disable-line no-param-reassign
    const subscriber = { handler, config };

    if (event instanceof RegExp) {
      const matcher = event.toString();
      store.matchers.unshift(event);

      if (!Array.isArray(store.matchersMap[matcher])) {
        store.matchersMap[matcher] = [];
      }

      store.matchersMap[matcher].unshift(subscriber);
    } else if (typeof event === 'string') {
      if (!Array.isArray(store.eventsMap[event])) {
        store.eventsMap[event] = [];
        set(store.eventsTree, event, store.eventsMap[event]);
      }

      store.eventsMap[event].unshift(subscriber);
    }

    emit('subscribed', event, subscriber);
  };

  const subscribeMap = (prefix, map) => (
    Object.keys(map).reduce((acc, method) => {
      const event = `${prefix}${delimiter}${method}`;
      const handler = map[method];
      subscribe(event, handler);

      return Object.assign(acc, {
        [method]: () => unsubscribe(event, handler)
      });
    }, {})
  );

  const removeSubscriberFromMap = (map, event, handler) => {
    const index = map[event].findIndex((subscriber) => subscriber.handler === handler);
    if (index > -1) {
      map[event].splice(index, 1);
    }
  };

  const unsubscribe = (event, handler = null) => {
    if (!handler) {
      if (typeof event === 'string') {
        delete store.eventsMap[event];
      } else {
        delete store.matchersMap[event];
      }
    } else {
      const map = typeof event === 'string' ? store.eventsMap : store.matchersMap;
      removeSubscriberFromMap(map, event, handler);
    }

    emit('unsubscribed', event, handler);
  };

  const getEventSubscribersMatching = (event) => (
    store.matchers
      .filter((matcher) => matcher.test(event))
      .reduce((acc, matcher) => acc.concat(store.matchersMap[matcher.toString()] || []), [])
      .concat(store.eventsMap[event] || [])
  );

  const dispatch = (event, params, done) => {
    event = validateEvent(event, delimiter); // eslint-disable-line no-param-reassign

    if (typeof event !== 'string') {
      throw new Error(
        `You can only dispatch events of type string and array (got ${typeof event} instead).`
      );
    }

    const subscribers = getEventSubscribersMatching(event);

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

  const runHandler = (handler, params, config, next) => {
    let resolve;
    let reject;

    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    try {
      const result = handler({
        params: processParams(params, config),
        next,
        dispatch,
        lookup,
        emit,
        emitBefore,
        emitAfter
      }, (err, value) => {
        process.nextTick(() => {
          if (err) {
            emitter.emit('error', err);
            reject(err);
          } else {
            resolve(value);
          }
        });
      });

      if (typeof result !== 'undefined') {
        resolve(result);
      }
    } catch (err) {
      emitter.emit('error', err);
      reject(err);
    }

    return promise;
  };

  const cascadeSubscribers = (subscribers, params) => {
    if (!subscribers.length) {
      return Promise.resolve(params);
    }

    const { handler, config } = subscribers.shift();

    const next = (nextParams) => cascadeSubscribers(subscribers, nextParams);

    return runHandler(handler, params, config, next);
  };

  const lookup = (path) => {
    const methods = get(store.eventsTree, path, {});

    return Object.keys(methods).reduce((acc, methodName) => (
      Object.assign(acc, {
        [methodName]: (params) => dispatch(`${path}${delimiter}${methodName}`, params)
      })
    ), {});
  };

  return {
    emit, emitBefore, emitAfter, on, onBefore, onAfter,
    dispatch, subscribe, unsubscribe, subscribeMap, lookup
  };
};
