import { set as setPath, get as getPath } from 'lodash';
import Joi from 'joi';
import EventEmitter from 'events';

const RESTRICTED_EVENTS = ['error', 'subscribe', 'unsubscribe'];

export default class EventDispatcher {
  static defaultOptions = {
    delimiter: '.',

    createEventEmitter() {
      const eventEmitter = new EventEmitter();
      eventEmitter.on('error', () => {});
      return eventEmitter;
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
    },
  };

  constructor(options) {
    this.options = {
      ...EventDispatcher.defaultOptions,
      ...options,
    };

    const { createEventEmitter } = this.options;

    this.delimiter = this.options.delimiter;
    this.processParams = this.options.processParams;

    this.store = {
      eventsMap: new Map(),
      matchersMap: new Map(),
      eventsTree: {},
    };

    this.eventEmitter = createEventEmitter();
  }

  on = (...args) => {
    this.eventEmitter.on(...args);
  }

  emit = (event, ...args) => {
    const finalArgs = args.concat([{
      dispatch: this.dispatch,
      lookup: this.lookup,
    }]);

    this.eventEmitter.emit(event, ...finalArgs);
  }

  onBefore = (event, ...args) => {
    this.on(`before:${event}`, ...args);
  }

  onAfter = (event, ...args) => {
    this.on(`after:${event}`, ...args);
  }

  emitBefore = (event, ...args) => {
    this.emit(`before:${event}`, ...args);
  }

  emitAfter = (event, ...args) => {
    this.emit(`after:${event}`, ...args);
  }

  subscribe = (event, handler, config = {}) => {
    if (typeof handler !== 'function') {
      throw new Error(`
        Event handler for ${event.toString()} has to be a function (got ${typeof handler} instead)!
      `);
    }

    event = this.validateEvent(event, this.delimiter); // eslint-disable-line no-param-reassign
    const subscriber = { handler, config };

    if (event instanceof RegExp) {
      this.store.matchersMap.set(event, subscriber);
    }

    if (typeof event === 'string') {
      if (!this.store.eventsMap.has(event)) {
        this.store.eventsMap.set(event, []);
        setPath(this.store.eventsTree, event, this.store.eventsMap.get(event));
      }

      this.store.eventsMap.get(event).unshift(subscriber);
    }

    this.emit('subscribed', event, subscriber);

    return () => this.unsubscribe(event, handler);
  }

  subscribeMap = (prefix, map) => (
    Object.keys(map).reduce((acc, method) => {
      const event = `${prefix}${this.delimiter}${method}`;
      const handler = map[method];
      this.subscribe(event, handler);

      return Object.assign(acc, {
        [method]: () => this.unsubscribe(event, handler),
      });
    }, {})
  )

  unsubscribe = (event, handler = null) => {
    if (this.store.matchersMap.has(event)) {
      this.store.matchersMap.delete(event);
    }

    if (this.store.eventsMap.has(event)) {
      if (!handler) {
        this.store.eventsMap.delete(event);
      } else {
        const index = this.store.eventsMap.get(event).findIndex(
          (subscriber) => subscriber.handler === handler
        );
        if (index > -1) {
          this.store.eventsMap.get(event).splice(index, 1);
        }
      }
    }

    this.emit('unsubscribed', event, handler);
  }

  dispatch = (event, params, done) => {
    event = this.validateEvent(event, this.delimiter); // eslint-disable-line no-param-reassign

    if (typeof event !== 'string') {
      throw new Error(
        `You can only dispatch events of type string and array (got ${typeof event} instead).`
      );
    }

    const subscribers = this.getEventSubscribersMatching(event);

    if (!subscribers.length) {
      return Promise.reject(new Error(`No subscribers registered for the ${event} event.`));
    }

    this.emitBefore(event, params, {
      dispatch: this.dispatch,
      lookup: this.lookup,
    });

    return this.cascadeSubscribers(subscribers, params).then((result) => {
      this.emitAfter(event, result, {
        dispatch: this.dispatch,
        lookup: this.lookup,
      });

      return done ? done(null, result) : result;
    }, (err) => {
      if (done) {
        return done(err);
      }

      throw err;
    });
  }

  getEventSubscribersMatching = (event) => {
    let subscribers = [];

    this.store.matchersMap.forEach((subscriber, matcher) => {
      if (matcher.test(event)) {
        subscribers.unshift(subscriber);
      }
    });

    if (this.store.eventsMap.has(event)) {
      subscribers = subscribers.concat(this.store.eventsMap.get(event));
    }

    return subscribers;
  }

  runHandler = (handler, params, config, next) => {
    let resolve;
    let reject;

    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    try {
      const result = handler({
        params: this.processParams(params, config),
        next,
        dispatch: this.dispatch,
        lookup: this.lookup,
        emit: this.emit,
        emitBefore: this.emitBefore,
        emitAfter: this.emitAfter,
      }, (err, value) => {
        process.nextTick(() => {
          if (err) {
            this.eventEmitter.emit('error', err);
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
      this.eventEmitter.emit('error', err);
      reject(err);
    }

    return promise;
  }

  cascadeSubscribers = (subscribers, params) => {
    if (!subscribers.length) {
      return Promise.resolve(params);
    }

    const { handler, config } = subscribers.shift();

    const next = (nextParams) => this.cascadeSubscribers(subscribers, nextParams);

    return this.runHandler(handler, params, config, next);
  }

  lookup = (path) => {
    const methods = getPath(this.store.eventsTree, path, {});

    return Object.keys(methods).reduce((acc, methodName) => (
      Object.assign(acc, {
        [methodName]: (params) => this.dispatch(`${path}${this.delimiter}${methodName}`, params),
      })
    ), {});
  }

  validateEvent = (event, delimiter) => {
    Joi.assert(event, [
      Joi.string().regex(/^([A-Za-z0-9]+\.?)+$/).invalid(RESTRICTED_EVENTS),
      Joi.array().min(1).items(Joi.string()),
      Joi.object().type(RegExp),
    ]);

    if (Array.isArray(event)) {
      return event.map((ev) => this.validateEvent(ev, delimiter)).join(delimiter);
    }

    if (typeof event === 'string') {
      return event.trim();
    }

    return event;
  }
}

export function createEventDispatcher(options) {
  return new EventDispatcher(options);
}
