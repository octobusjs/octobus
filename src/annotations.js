import Joi from 'joi';

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
};
