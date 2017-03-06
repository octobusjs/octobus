import Message from './Message';

class Context {
  constructor({ message, plugin }) {
    this.message = message;
    this.plugin = plugin;
    this.next = undefined;
  }

  extract = (path) => {
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

  send = (message) => this.plugin.send(this.message.fork(message.toJSON()))

  clone(data) {
    return new Context({
      message: this.message.fork({ data }),
      plugin: this.plugin,
    });
  }

  createMessage(params) {
    return this.message.fork(params);
  }
}

export default Context;
