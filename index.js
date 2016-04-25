import _ from 'lodash';
import Joi from 'joi';
import EventEmitter from 'events';

const RESTRICTED_EVENTS = ['error', 'subscribe', 'unsubscribe'];

const normalizeEvent = (event, delimiter) => (Array.isArray(event) ? event.join(delimiter) : event);

const defaultProcessParams = (params, config = {}) => {
  const { defaultParams, schema } = config;
  let finalParams = params;

  if (defaultParams) {
    finalParams = Object.assign({}, defaultParams, params);
  }

  if (schema) {
    const { error, value } = Joi.validate(finalParams, schema);
    if (error) {
      throw error;
    }

    finalParams = value;
  }

  return finalParams;
};

const defaultOptions = {
  delimiter: '.',
  processParams: defaultProcessParams
};

export default (options = {}) => {
  const { delimiter, processParams } = Object.assign({}, defaultOptions, options);

  const store = {
    subscribers: [],
    eventsMap: {},
    eventsTree: {},
    matchers: [],
    matchersMap: {}
  };

  const emitter = new EventEmitter();
  const on = emitter.on.bind(emitter);

  const subscribe = (event, handler, config = {}) => {
    event = normalizeEvent(event, delimiter); // eslint-disable-line no-param-reassign
    const subscriber = { handler, config };
    const subscriberIndex = store.subscribers.push(subscriber) - 1;

    if (event instanceof RegExp) {
      const matcher = event.toString();
      store.matchers.unshift(event);

      if (!Array.isArray(store.matchersMap[matcher])) {
        store.matchersMap[matcher] = [];
      }

      store.matchersMap[matcher].unshift(subscriberIndex);
    } else if (typeof event === 'string') {
      if (RESTRICTED_EVENTS.includes(event)) {
        throw new Error(`Forbidden event: ${event} (${RESTRICTED_EVENTS.join(',')})`);
      }

      if (!Array.isArray(store.eventsMap[event])) {
        store.eventsMap[event] = [];
        _.set(store.eventsTree, event, store.eventsMap[event]);
      }

      store.eventsMap[event].unshift(subscriberIndex);
    } else {
      throw new Error(`Can't handle event ${event} of type ${typeof event}.`);
    }

    emitter.emit('subscribed', event, subscriber);
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

  const unsubscribe = (event, handler) => {
    if (!handler) {
      if (typeof event === 'string') {
        delete store.eventsMap[event];
      } else {
        delete store.matchersMap[event];
      }
    } else {
      const subscriberIndex = store.subscribers.find(({ _handler }) => _handler === handler);
      store.subscribers.splice(subscriberIndex, 1);

      if (typeof event === 'string') {
        store.eventsMap[event].splice(store.eventsMap[event].indexOf(subscriberIndex), 1);
      } else {
        store.matchersMap[event].splice(store.matchersMap[event].indexOf(subscriberIndex), 1);
      }
    }

    emitter.emit('unsubscribed', event, handler);
  };

  const getEventSubscribers = (event) => (
    (store.eventsMap[event] || []).map((index) => store.subscribers[index])
  );

  const getMatcherSubscribers = (matcher) => (
    (store.matchersMap[matcher] || []).map((index) => store.subscribers[index])
  );

  const getEventSubscribersMatching = (event) => (
    store.matchers
      .filter((matcher) => matcher.test(event))
      .reduce((acc, matcher) => acc.concat(getMatcherSubscribers(matcher.toString())), [])
      .concat(getEventSubscribers(event))
  );

  const dispatch = (event, params) => {
    event = normalizeEvent(event, delimiter); // eslint-disable-line

    if (typeof event !== 'string') {
      throw new Error('You can only dispatch string event names!');
    }

    const subscribers = getEventSubscribersMatching(event);

    emitter.emit(`before:${event}`, params);
    return cascadeSubscribers(subscribers, params).then((result) => {
      process.nextTick(() => {
        emitter.emit(`after:${event}`, result);
      });

      return result;
    });
  };

  const cascadeSubscribers = (subscribers, params) => {
    if (!subscribers.length) {
      return Promise.resolve(params);
    }

    const { handler, config } = subscribers.shift();
    const is = {
      called: false
    };
    let resolve;
    let reject;

    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    try {
      const finalParams = processParams(params, config);

      const result = handler({
        params: finalParams,
        next: (nextParams) => cascadeSubscribers(subscribers, nextParams),
        dispatch,
        lookup
      }, (err, value) => {
        process.nextTick(() => {
          if (is.called) {
            throw new Error('Already called!');
          }

          if (err) {
            emitter.emit('error', err);
            reject(err);
          } else {
            resolve(value);
          }
        });
      });

      if (typeof result !== 'undefined') {
        is.called = true;
        resolve(result);
      }
    } catch (err) {
      emitter.emit('error', err);
      reject(err);
    }

    return promise;
  };

  const lookup = (path) => {
    const methods = _.get(store.eventsTree, path, {});

    return Object.keys(methods).reduce((acc, methodName) => (
      Object.assign(acc, {
        [methodName]: (params) => dispatch(`${path}${delimiter}${methodName}`, params)
      })
    ), {});
  };

  return {
    dispatch, on, subscribe, unsubscribe, subscribeMap, lookup
  };
};
