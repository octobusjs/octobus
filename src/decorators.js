import Joi from 'joi';
import memoize from 'lodash/memoize';
import isPlainObject from 'lodash/isPlainObject';

export const withDefaultParams = (defaultParams, handler) => (args, cb) => {
  const { params } = args;
  const isMergeable = isPlainObject(defaultParams) && isPlainObject(params);
  const processedParams = isMergeable ?
    { ...defaultParams, ...params } :
    (params || defaultParams);

  return handler({
    ...args,
    params: processedParams,
  }, cb);
};

export const withSchema = (schema, handler) => (args, cb) => {
  const { params } = args;
  const processedParams = Joi.attempt(params, schema);

  return handler({
    ...args,
    params: processedParams,
  }, cb);
};

export const withNamespace = (namespace, handler) => (args, cb) => {
  const { dispatch } = args;

  return handler({
    ...args,
    dispatch: (event, params) => {
      let namespacedEvent = namespace;
      if (event) {
        namespacedEvent += `.${event.toString().trim()}`;
      }
      return dispatch(namespacedEvent, params);
    },
  }, cb);
};

export const withLookups = (lookups, handler) => (args, cb) => {
  const { lookup } = args;

  const dispatches = Object.keys(lookups).reduce((ds, key) => ({
    ...ds,
    [key]: lookup(lookups[key]),
  }), {});

  return handler({
    ...args,
    ...dispatches,
  }, cb);
};

export const withHandler = (handler) => (args, cb) => {
  const { params } = args;
  return handler({
    ...args,
    ...params,
  }, cb);
};

export const withMemoization = (handler) => memoize(handler, ({ params }) => params);
