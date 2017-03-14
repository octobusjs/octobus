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

  send = (...args) => {
    const message = this.plugin.createMessage(...args);
    return this.plugin.send(this.message.fork(message));
  }

  publish = (...args) => {
    const message = this.plugin.createMessage(...args);
    return this.plugin.publish(this.message.fork(message));
  }

  clone(data) {
    return new Context({
      message: this.message.fork({ data }),
      plugin: this.plugin,
    });
  }
}

export default Context;
