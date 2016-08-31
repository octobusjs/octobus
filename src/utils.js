import shortid from 'shortid';

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

// https://github.com/reactjs/redux/blob/master/src/compose.js
export const compose = (...funcs) => {
  if (funcs.length === 0) {
    return arg => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  const last = funcs[funcs.length - 1];
  const rest = funcs.slice(0, -1);
  return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args));
};

export const generateUId = () => shortid.generate();

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
