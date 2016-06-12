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

  run({
    params,
    next,
    dispatch,
    lookup,
    emit,
    emitBefore,
    emitAfter,
    processParams,
    onError,
  }) {
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
      params = processParams(params, this.config); // eslint-disable-line no-param-reassign

      const result = this.fn({
        params,
        next,
        dispatch,
        lookup,
        emit,
        emitBefore,
        emitAfter,
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
