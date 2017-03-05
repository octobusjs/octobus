import Message from './Message';

class Context {
  constructor({ message, broker }) {
    this.message = message;
    this.broker = broker;
    this.next = undefined;
  }

  lookup = (path) => {
    const send = this.send;
    return new Proxy({}, {
      get(target, methodName) {
        return (data) => {
          const topic = `${path}.${methodName}`;
          const message = new Message({ topic, data });
          return send(message);
        };
      },
    });
  }

  send = (message) => this.broker.send(this.message.fork(message.toJSON()))

  clone(data) {
    return new Context({
      message: this.message.fork({ data }),
      broker: this.broker,
    });
  }
}

export default Context;
