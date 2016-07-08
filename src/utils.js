import Joi from 'joi';

const restrictedEvents = ['error', 'subscribe', 'unsubscribe'];
const validEventPattern = /^([A-Za-z0-9]+\.?)+$/;
const callableErrorMessage = 'Callback already called!';

export const createOneTimeCallable = (fn, errorMessage = callableErrorMessage) => {
  let called = false;
  return (...args) => {
    if (called) {
      throw new Error(errorMessage);
    }
    called = true;

    return fn(...args);
  };
};

export const validateEvent = (event, delimiter) => {
  Joi.assert(event, [
    Joi.string().regex(validEventPattern).invalid(restrictedEvents),
    Joi.array().min(1).items(Joi.string().regex(validEventPattern)),
    Joi.object().type(RegExp),
  ]);

  if (Array.isArray(event)) {
    return validateEvent(event.join(delimiter));
  }

  if (typeof event === 'string') {
    return event.trim();
  }

  return event;
};

export const createSubscribersChain = () => {

};
