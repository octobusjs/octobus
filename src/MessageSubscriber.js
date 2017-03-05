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

  getDecoratedHandler() {
    return this.decorators.length ?
      flow(this.decorators.reverse())(this.handler) :
      this.handler;
  }

  async run(args) {
    let resolve;
    let reject;

    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    const handleResult = MessageSubscriber.createOneTimeCallable((result) => {
      if (result instanceof Error) {
        reject(result);
      } else {
        resolve(result);
      }
    }, 'The result was already handled!');

    const handler = this.getDecoratedHandler();

    try {
      const result = await Promise.resolve(handler({
        ...args,
        reply: handleResult,
      }));

      if (result !== undefined) {
        handleResult(result);
      }
    } catch (err) {
      handleResult(err);
    }

    return promise;
  }
}

export default MessageSubscriber;
