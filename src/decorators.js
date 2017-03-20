import Joi from 'joi';

const withSchema = (schema) => (target, propr, descriptor) => {
  const oldValue = descriptor.value;

  Object.assign(descriptor, {
    value(...args) {
      return oldValue.apply(this, [Joi.attempt(args[0], schema), ...args.slice(1)]);
    },
  });
};

const service = (config = {}) => (target, propr, descriptor) => {
  Object.assign(descriptor, {
    enumerable: true,
  });

  Object.assign(descriptor.value, {
    isService: true,
    serviceConfig: Joi.attempt(config, {
      name: Joi.string().default(propr),
      decorators: Joi.array().default([]),
    }),
  });
};

export {
  service,
  withSchema,
};
