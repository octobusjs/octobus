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

const applyDefaultParams = (params, defaultParams) => {
  if (typeof defaultParams === 'object' && !Array.isArray(defaultParams)) {
    return { ...defaultParams, ...params };
  }

  return defaultParams || params;
};

export const applyConfig = (handler, config) => (args, cb) => {
  const { defaultParams, schema } = config;
  const { params } = args;
  let processedParams = params;

  if (defaultParams) {
    processedParams = applyDefaultParams(processedParams, defaultParams);
  }

  if (schema) {
    processedParams = Joi.attempt(processedParams, schema);
  }

  return handler({
    ...args,
    params: processedParams,
  }, cb);
};

export const runHandler = (handler, args) => {
  const { onError, ...restArgs } = args;
  let resolve;
  let reject;

  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  const handleResult = createOneTimeCallable((err, result) => {
    if (err) {
      onError(err);
      reject(err);
    } else {
      resolve(result);
    }
  }, 'The result was already handled!');

  const reply = (value) => {
    const err = value instanceof Error ? value : null;
    handleResult(err, value);
  };

  try {
    const result = handler({
      ...restArgs,
      reply,
    }, handleResult);

    if (result !== undefined) {
      handleResult(null, result);
    }
  } catch (err) {
    handleResult(err);
  }

  return promise;
};
