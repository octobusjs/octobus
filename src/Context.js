import Message from './Message';

class Context {
  constructor({ message, broker }) {
    this.message = message;
    this._broker = broker;
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

  send = (message) => {
    Object.assign(message, {
      parentId: this.message.id,
    });

    return this._broker.send(message);
  }
}

export default Context;
