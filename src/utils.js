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
