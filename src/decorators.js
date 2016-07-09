import Joi from 'joi';
import _memoize from 'lodash/memoize';

export const withDefaultParams = (handler, defaultParams) => (args, cb) => {
  const { params } = args;
  const isPlainObject = typeof defaultParams === 'object' && !Array.isArray(defaultParams);
  const processedParams = isPlainObject ? { ...defaultParams, ...params } : params || defaultParams;

  return handler({
    ...args,
    params: processedParams,
  }, cb);
};

export const withSchema = (handler, schema) => (args, cb) => {
  const { params } = args;
  const processedParams = Joi.attempt(params, schema);

  return handler({
    ...args,
    params: processedParams,
  }, cb);
};

export const withNamespace = (namespace, handler) => (args) => {
  const { dispatch } = args;
  const nsDispatch = (event, msg) => dispatch(`${namespace}.${event}`, msg);

  return handler({
    ...args,
    nsDispatch,
  });
};

export const withLookups = (lookups, handler) => (args) => {
  const { lookup } = args;

  const dispatches = Object.keys(lookups).reduce((ds, key) => ({
    ...ds,
    [key]: lookup(lookups[key]),
  }), {});

  return handler({
    ...args,
    ...dispatches,
  });
};

export const toHandler = (fn) => ({ params }) => fn(params);

export const memoize = (handler) => _memoize(handler, ({ params }) => params);
