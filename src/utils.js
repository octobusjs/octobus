import uuid from 'uuid/v1';
import flow from 'lodash/flow';

export const createOneTimeCallable = (fn, errorMessage) => {
  let called = false;
  return (...args) => {
    if (called) {
      throw new Error(errorMessage);
    }
    called = true;

    return fn(...args);
  };
};

export const generateUId = uuid;

export const getErrorStack = () => (new Error()).stack.toString().split(/\r\n|\n/);

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

export const applyDecorators = (decorators, handler) => flow(decorators.reverse())(handler);

export const getTime = () => new Date().getTime();
