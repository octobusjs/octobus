import EventEmitter from 'events';
import { runHandler } from './utils';
import HandlersMap from './HandlersMap';
import Event from './Event';
import identity from 'lodash/identity';
import sortBy from 'lodash/sortBy';
import Joi from 'joi';

const createEvent = (eventId) => (eventId instanceof Event ? eventId : new Event(eventId));

export default class Octobus extends EventEmitter {
  constructor() {
    super();

    this.setMaxListeners(Infinity);

    this.handlersMap = new HandlersMap();
    this.matchers = [];
    this.queue = {};

    [
      'dispatch', 'subscribe', 'subscribeMap', 'unsubscribe', 'lookup',
      'emit', 'emitBefore', 'emitAfter', 'on', 'onBefore', 'onAfter',
    ].forEach((fn) => {
      this[fn] = this[fn].bind(this);
    });

    this.on('error', () => {});
  }

  validateSubscription(eventIdentifier) {
    return Joi.attempt(
      eventIdentifier,
      Joi.alternatives().try(
        Event.validator,
        Joi.object().type(RegExp),
      ).required()
    );
  }

  subscribe(rawEventIdentifier, handler, priority, meta = {}) {
    const eventIdentifier = this.validateSubscription(rawEventIdentifier);

    if (typeof handler !== 'function') {
      throw new Error(`
        Event handler for ${eventIdentifier} has to be a function (got ${typeof handler} instead)!
      `);
    }

    if (eventIdentifier instanceof RegExp) {
      this.addMatcher(eventIdentifier);
    }

    this.handlersMap.set(eventIdentifier.toString(), { handler, priority, meta });

    this.emit('subscribed', eventIdentifier, handler);

    return () => this.unsubscribe(eventIdentifier, handler);
  }

  subscribeMap(prefix, map) {
    return Object.keys(map).reduce((acc, method) => {
      const eventIdentifier = `${prefix}.${method}`;
      const handler = map[method];
      this.subscribe(eventIdentifier, handler);

      return {
        ...acc,
        [method]: () => this.unsubscribe(eventIdentifier, handler),
      };
    }, {});
  }

  unsubscribe(eventOrIdentifier, handler = null) {
    const event = eventOrIdentifier.toString();

    const ret = this.handlersMap.delete(event, handler);

    if (!handler) {
      const matcherIndex = this.matchers.findIndex((m) => m.toString() === event);
      if (matcherIndex > -1) {
        this.matchers.splice(matcherIndex, 1);
      }
    }

    this.emit('unsubscribed', eventOrIdentifier, handler);

    return ret;
  }

  consumeEvent({ event, params, runHandlers, eventName }) {
    const handlers = this.getEventHandlersMatching(event);

    if (!eventName) {
      eventName = event.toString(); // eslint-disable-line no-param-reassign
    }

    if (!handlers.length) {
      return Promise.reject(new Error(`No handlers registered for the ${event} event.`));
    }

    this.emitBefore(eventName, { params, event });
    return runHandlers(handlers).then((result) => {
      this.emitAfter(eventName, { params, result, event });
      return result;
    }, (error) => {
      this.emitAfter(eventName, { params, error, event });
      throw error;
    });
  }

  dispatch(eventId, params) {
    const event = createEvent(eventId);

    return this.consumeEvent({
      event,
      params,
      runHandlers: (handlers) => this.cascadeHandlers.call(this, handlers, params, event),
    });
  }

  publish(eventId, params) {
    const event = createEvent(eventId);

    return this.consumeEvent({
      event,
      eventName: `publish:${event}`,
      params,
      runHandlers: (handlers) => (
        Promise.all(
          handlers.map(
            (handlerConfig) => this.runHandler({ handlerConfig, event, params })
          )
        )
      ),
    });
  }

  lookup(path, eventFactory = identity) {
    const dispatch = this.dispatch;
    return new Proxy({}, {
      get(target, methodName) {
        return (params) => dispatch(eventFactory(`${path}.${methodName}`), params);
      },
    });
  }

  addMatcher(matcher) {
    const existingMatcher = this.matchers.find((m) => m.toString() === matcher.toString());

    if (!existingMatcher) {
      this.matchers.push(matcher);
    }
  }

  getEventHandlersMatching(rawEvent) {
    const event = rawEvent.toString();

    const handlers = this.matchers
      .filter((matcher) => matcher.test(event))
      .reduce((acc, matcher) => {
        acc.unshift(...this.handlersMap.get(matcher.toString()));
        return acc;
      }, this.handlersMap.get(event) || []);

    return sortBy(handlers, ({ priority }) => -1 * priority);
  }

  buildHandlerArgs({
    params, event,
  }) {
    return {
      event,
      params,
      dispatch: (...args) => this.dispatch(Event.from(args[0], event), ...args.slice(1)),
      lookup: (path) => this.lookup(path, (eventIdentifier) => Event.from(eventIdentifier, event)),
      onError: (err) => this.emit('error', err),
      ...this.getAPI('emit', 'emitBefore', 'emitAfter'),
    };
  }

  runHandler(args) {
    const { handlerConfig, params, event, ...rest } = args;
    return runHandler(handlerConfig.handler, {
      ...this.buildHandlerArgs({ event, params }),
      ...rest,
    });
  }

  cascadeHandlers(handlers, params, event) {
    const handlerConfig = handlers.shift();

    return this.runHandler({
      handlerConfig, params, event,
      next: handlers.length ?
        (nextParams) => this.cascadeHandlers(handlers, nextParams, event) :
        undefined,
    });
  }

  emit(event, ...args) {
    return super.emit(event.toString(), ...args);
  }

  onBefore(event, ...args) {
    return this.on(`before:${event}`, ...args);
  }

  onAfter(event, ...args) {
    return this.on(`after:${event}`, ...args);
  }

  emitBefore(event, args, ...restArgs) {
    return this.emit(
      `before:${event}`, { ...args, ...this.getAPI('dispatch', 'lookup') }, ...restArgs
    );
  }

  emitAfter(event, args, ...restArgs) {
    return this.emit(
      `after:${event}`, { ...args, ...this.getAPI('dispatch', 'lookup') }, ...restArgs
    );
  }

  getAPI(...methods) {
    return methods.reduce((acc, method) => ({
      ...acc,
      [method]: this[method],
    }), {});
  }
}
