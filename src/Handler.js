import Joi from 'joi';
import set from 'lodash/set';
import get from 'lodash/get';
import { createOneTimeCallable } from './utils';

export default class Handler {
  static callableErrorMessage = 'The result was already handled!';

  constructor(fn, config = {}) {
    this.fn = fn;
    this.config = config;
  }

  setConfig(key, value) {
    set(this.config, key, value);
  }

  getConfig(key = null) {
    if (!key) {
      return this.config;
    }

    return get(this.config, key);
  }

  isEqualTo(handler) {
    const fn = typeof handler === 'function' ? handler : handler.fn;
    return this.fn === fn;
  }

  processParams(params) {
    const { defaultParams, schema } = this.config;
    let processedParams = params;

    if (defaultParams) {
      processedParams = Object.assign({}, defaultParams, params);
    }

    if (schema) {
      processedParams = Joi.attempt(processedParams, schema);
    }

    return processedParams;
  }

  run(options) {
    const { onError, ...args } = options;
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
    }, Handler.callableErrorMessage);

    const reply = (value) => {
      const err = value instanceof Error ? value : null;
      handleResult(err, value);
    };

    try {
      const params = this.processParams(options.params);

      const result = this.fn({
        ...args,
        params,
        reply,
      }, handleResult);

      if (result !== undefined) {
        handleResult(null, result);
      }
    } catch (err) {
      handleResult(err);
    }

    return promise;
  }
}
