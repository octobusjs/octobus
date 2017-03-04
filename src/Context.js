import Message from './Message';

class Context {
  constructor({ message, broker }) {
    this.message = message;
    this.broker = broker;
    this.next = undefined;
  }

  lookup(path) {
    return new Proxy({}, {
      get(target, methodName) {
        return (params) => {
          const channel = `${path}.${methodName}`;
          const message = new Message(channel, params);
          return this.broker.send(message);
        };
      },
    });
  }
}

export default Context;
