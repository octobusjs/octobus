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
    const handler = this.decorators.length ?
      flow(this.decorators.reverse())(this.handler) :
      this.handler;

    return Promise.resolve(handler(args));
  }
}

export default MessageSubscriber;
