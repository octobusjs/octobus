import flow from 'lodash/flow';

class MessageSubscriber {
  static createOneTimeCallable(fn, errorMessage) {
    let called = false;
    return (...args) => {
      if (called) {
        throw new Error(errorMessage);
      }
      called = true;

      return fn(...args);
    };
  }

  constructor(handler, decorators = []) {
    this.handler = handler;
    this.decorators = decorators;
  }

  decorate(decorator) {
    this.decorators.push(decorator);
  }

  run(args) {
    let resolve;
    let reject;

    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    const handleResult = MessageSubscriber.createOneTimeCallable((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    }, 'The result was already handled!');

    const reply = (value) => {
      const err = value instanceof Error ? value : null;
      handleResult(err, value);
    };

    try {
      const handler = this.decorators.length ?
        flow(this.decorators.reverse())(this.handler) :
        this.handler;

      const result = handler({
        ...args,
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

export default MessageSubscriber;
