import EventEmitter from 'events';
import { compose, getErrorStack, runHandler } from './utils';
import HandlersMap from './HandlersMap';
import Event from './Event';
import identity from 'lodash/identity';
import sortBy from 'lodash/sortBy';

export default class Octobus extends EventEmitter {
  static defaultOptions = {
    middlewares: [],
  };

  constructor(options = {}) {
    super();

    this.options = {
      ...Octobus.defaultOptions,
      ...options,
    };
    this.handlersMap = new HandlersMap();
    this.matchers = [];
    this.regExpMatchers = [];

    [
      'dispatch', 'subscribe', 'subscribeMap', 'unsubscribe', 'lookup',
      'emit', 'emitBefore', 'emitAfter', 'onBefore', 'onAfter',
    ].forEach((fn) => {
      this[fn] = this[fn].bind(this);
    });

    this.on('error', () => {});
  }

  subscribe(eventIdentifier, handler, priority) {
    eventIdentifier = Event.validate(eventIdentifier); // eslint-disable-line no-param-reassign

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
      const rIndex = this.regExpMatchers.findIndex((m) => m.toString() === event);
      if (rIndex > -1) {
        this.regExpMatchers.splice(rIndex, 1);
      }

      const sIndex = this.matchers.findIndex((m) => m === event);
      if (sIndex > -1) {
        this.matchers.splice(sIndex, 1);
      }
    }

    this.emit('unsubscribed', eventOrIdentifier, handler);
  }

  dispatch(eventOrIdentifier, params, done) {
    const event = eventOrIdentifier instanceof Event ? eventOrIdentifier :
      new Event(eventOrIdentifier);
    const res = this.runMiddlewares({ event, params });
    params = res.params; // eslint-disable-line no-param-reassign

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

  runMiddlewares(...args) {
    return compose(...this.options.middlewares.reverse())(...args);
  }

  addMatcher(rawMatcher) {
    const matcher = rawMatcher.toString();

    if (rawMatcher instanceof RegExp) {
      const existingMatcher = this.regExpMatchers.find((m) => m.toString() === matcher);
      if (!existingMatcher) {
        this.regExpMatchers.push(rawMatcher);
      }
      return;
    }

    if (!this.matchers.includes(matcher)) {
      this.matchers.push(matcher);
    }
  }

  getEventHandlersMatching(rawEvent) {
    const event = rawEvent.toString();
    const matchers = [];

    if (rawEvent.identifier instanceof RegExp) {
      matchers.push(
        ...this.matchers.filter((matcher) => rawEvent.identifier.test(matcher))
      );
    } else {
      if (this.matchers.includes(event)) {
        matchers.push(event);
      }

      matchers.push(
        ...this.regExpMatchers.filter((rMatcher) => rMatcher.test(event))
      );
    }

    const handlers = matchers.reduce((acc, matcher) => {
      acc.unshift(...this.handlersMap.get(matcher.toString()));
      return acc;
    }, []);

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
