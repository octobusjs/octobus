import Joi from 'joi';

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

export const toHandler = (fn) => ({ params }) => fn(params);
