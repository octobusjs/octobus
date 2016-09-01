import EventEmitter from 'events';
import { getErrorStack, runHandler } from './utils';
import HandlersMap from './HandlersMap';
import Event from './Event';
import identity from 'lodash/identity';
import sortBy from 'lodash/sortBy';
import Joi from 'joi';

export default class Octobus extends EventEmitter {
  constructor() {
    super();

    this.handlersMap = new HandlersMap();
    this.matchers = [];

    [
      'dispatch', 'subscribe', 'subscribeMap', 'unsubscribe', 'lookup',
      'emit', 'emitBefore', 'emitAfter', 'onBefore', 'onAfter',
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

  subscribe(rawEventIdentifier, handler, priority) {
    const eventIdentifier = this.validateSubscription(rawEventIdentifier);

    if (typeof handler !== 'function') {
      throw new Error(`
        Event handler for ${eventIdentifier} has to be a function (got ${typeof handler} instead)!
      `);
    }

    this.addMatcher(eventIdentifier);

    const filename = getErrorStack()[3];

    this.handlersMap.set(eventIdentifier.toString(), { handler, priority, filename });

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

    this.handlersMap.delete(event, handler);

    if (!handler) {
      const matcherIndex = this.matchers.findIndex((m) => m.toString() === event);
      if (matcherIndex > -1) {
        this.matchers.splice(matcherIndex, 1);
      }
    }

    this.emit('unsubscribed', eventOrIdentifier, handler);
  }

  dispatch(eventOrIdentifier, params, done) {
    const event = eventOrIdentifier instanceof Event ? eventOrIdentifier :
      new Event(eventOrIdentifier);

    const handlers = this.getEventHandlersMatching(event);

    if (!handlers.length) {
      return Promise.reject(new Error(`No handlers registered for the ${event} event.`));
    }

    this.emitBefore(event, { params, event, ...this.getAPI('dispatch', 'lookup') });
    return this.cascadeHandlers(handlers, params, event).then((result) => {
      this.emitAfter(event, { params, result, event, ...this.getAPI('dispatch', 'lookup') });
      return done ? done(null, result) : result;
    }, (error) => {
      this.emitAfter(event, { params, error, event, ...this.getAPI('dispatch', 'lookup') });

      if (done) {
        return done(error);
      }

      throw error;
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
    if (!(matcher instanceof RegExp)) {
      return;
    }

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

  cascadeHandlers(handlers, params, event) {
    if (!handlers.length) {
      return Promise.resolve(params);
    }

    const { handler, filename } = handlers.shift();
    event.selfCalls.push({
      params,
      subscriptionFilename: filename.trim(),
    });

    const next = (nextParams) => this.cascadeHandlers(handlers, nextParams, event);

    const onError = (err) => this.emit('error', err);

    return runHandler(handler, {
      event,
      params,
      next,
      dispatch: (...args) => this.dispatch(Event.from(args[0], event), ...args.slice(1)),
      lookup: (path) => this.lookup(path, (eventIdentifier) => Event.from(eventIdentifier, event)),
      onError,
      ...this.getAPI('emit', 'emitBefore', 'emitAfter'),
    });
  }

  emit(event, ...args) {
    return super.emit(event.toString(), ...args.concat([this.getAPI('dispatch', 'lookup')]));
  }

  onBefore(event, ...args) {
    return this.on(`before:${event}`, ...args);
  }

  onAfter(event, ...args) {
    return this.on(`after:${event}`, ...args);
  }

  emitBefore(event, ...args) {
    return this.emit(`before:${event}`, ...args);
  }

  emitAfter(event, ...args) {
    return this.emit(`after:${event}`, ...args);
  }

  getAPI(...methods) {
    return methods.reduce((acc, method) => ({
      ...acc,
      [method]: this[method],
    }), {});
  }
}