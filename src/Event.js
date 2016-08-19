import { generateUId } from './utils';
import Joi from 'joi';

const restrictedEvents = ['error', 'subscribe', 'unsubscribe'];
const validEventPattern = /^([A-Za-z0-9]+\.?)+$/;

export default class Event {
  static validate(eventIdentifier) {
    Joi.assert(eventIdentifier, Joi.alternatives().try(
      Joi.string().required().regex(validEventPattern).invalid(restrictedEvents),
      Joi.object().type(RegExp),
    ).required());
  }

  static normalize(eventIdentifier) {
    Event.validate(eventIdentifier);

    if (typeof eventIdentifier === 'string') {
      return eventIdentifier.trim();
    }

    return eventIdentifier;
  }

  static from(eventOrIdentifier, parent, meta) {
    if (eventOrIdentifier instanceof Event) {
      return Object.assign(eventOrIdentifier, {
        parent,
        meta: {
          ...(eventOrIdentifier.meta || {}),
          ...meta,
        },
      });
    }

    return new Event(eventOrIdentifier, parent, meta);
  }

  constructor(identifier, parent, meta = {}) {
    this.identifier = Event.normalize(identifier);
    this.parent = parent;
    this.meta = meta;
    this.uid = generateUId();
  }

  toString() {
    return this.identifier.toString();
  }

  isMatch(matcher) {
    if (this.identifier instanceof RegExp && (typeof matcher === 'string')) {
      return this.identifier.test(matcher);
    }

    if (matcher instanceof RegExp && (typeof this.identifier === 'string')) {
      return matcher.test(this.identifier);
    }

    return this.toString() === matcher.toString();
  }
}
