import Message from './Message';

class Context {
  constructor({ message, broker }) {
    this.message = message;
    this._broker = broker;
    this.next = undefined;
  }

  lookup = (path) => {
    const broker = this._broker;
    return new Proxy({}, {
      get(target, methodName) {
        return (params) => {
          const topic = `${path}.${methodName}`;
          const message = new Message(topic, params);
          return broker.send(message);
        };
      },
    });
  }

  send = (message) => {
    Object.assign(message, {
      parentId: this.message.id,
    });

    return this._broker.send(message);
  }
}

export default Context;
