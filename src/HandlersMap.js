import Joi from 'joi';

export default class HandlersMap extends Map {
  set(key, handlerConfig) {
    Joi.attempt(handlerConfig, {
      handler: Joi.func().required(),
      priority: Joi.number(),
      meta: Joi.object(),
    });

    if (!this.has(key)) {
      super.set(key, []);
    }

    if (handlerConfig.priority === undefined) {
      handlerConfig.priority = 1; // eslint-disable-line no-param-reassign
    }

    this.get(key).unshift(handlerConfig);
  }

  delete(key, handler) {
    if (!this.has(key)) {
      return false;
    }

    if (!handler) {
      super.delete(key);
      return true;
    }

    return this.removeHandler(key, handler);
  }

  removeHandler(key, handler) {
    const index = this.get(key).findIndex(({ handler: _handler }) => _handler === handler);
    if (index === -1) {
      return false;
    }

    this.get(key).splice(index, 1);

    return true;
  }
}
