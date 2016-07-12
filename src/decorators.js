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

export const withNamespace = (handler, namespace) => (args) => {
  const { dispatch } = args;

  return handler({
    ...args,
    dispatch: (event, params) => {
      let namespacedEvent = namespace;
      if (event) {
        namespacedEvent += `.${event.toString().trim()}`;
      }
      return dispatch(`${namespacedEvent}`, params);
    },
  });
};

export const withLookups = (handler, lookups) => (args) => {
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

export const withHandler = (handler) => (args) => {
  const { params } = args;
  return handler({
    ...args,
    ...params,
  });
};

export const withMemoization = (handler) => _memoize(handler, ({ params }) => params);
