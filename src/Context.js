import Message from './Message';

class Context {
  constructor({ message, serviceBus }) {
    this.message = message;
    this.serviceBus = serviceBus;
    this.next = undefined;
  }

  extract = path => {
    const send = this.send;
    return new Proxy(
      {},
      {
        get(target, methodName) {
          return data => {
            const topic = `${path}.${methodName}`;
            const message = new Message({ topic, data });
            return send(message);
          };
        },
      },
    );
  };

  send = (...args) => {
    const message = this.serviceBus.createMessage(...args);
    return this.serviceBus.send(this.message.fork(message));
  };

  publish = (...args) => {
    const message = this.serviceBus.createMessage(...args);
    return this.serviceBus.publish(this.message.fork(message));
  };

  clone(data) {
    return new Context({
      message: this.message.fork({ data }),
      serviceBus: this.serviceBus,
    });
  }
}

export default Context;
