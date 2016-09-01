import { generateUId } from './utils';
import Joi from 'joi';

const restrictedEvents = ['error', 'subscribe', 'unsubscribe'];
const validEventPattern = /^([A-Za-z0-9]+\.?)+$/;

export default class Event {
  static validator =
    Joi.string().trim().regex(validEventPattern).invalid(restrictedEvents).required();

  static validate(eventIdentifier) {
    return Joi.attempt(eventIdentifier, Event.validator);
  }

  static from(eventOrIdentifier, parent, meta = {}) {
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
    this.identifier = Event.validate(identifier);
    this.parent = parent;
    this.meta = meta;
    this.uid = generateUId();
    this.selfCalls = [];
  }

  toString() {
    return this.identifier.toString();
  }
}
