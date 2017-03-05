import Joi from 'joi';
import memoize from 'lodash/memoize';
import isPlainObject from 'lodash/isPlainObject';

export const withDefaults = (defaults) => (handler) => (args) => {
  const { data } = args.message;
  const isMergeable = isPlainObject(defaults) && isPlainObject(data);
  const finalData = isMergeable ?
    { ...defaults, ...data } :
    (data || defaults);

  Object.assign(args.message, {
    data: finalData,
  });

  return handler(args);
};

export const withSchema = (schema) => (handler) => (args) => {
  const { data } = args.message;
  const validData = Joi.attempt(data, schema);

  Object.assign(args.message, {
    data: validData,
  });

  return handler(args);
};

export const withLookups = (lookups) => (handler) => (args) => {
  const { lookup } = args;

  const pins = Object.keys(lookups).reduce((acc, key) => ({
    ...acc,
    [key]: lookup(lookups[key]),
  }), {});

  return handler({
    ...args,
    ...pins,
  });
};

export const withMemoization = (handler) => memoize(handler, ({ message }) => message.data);
