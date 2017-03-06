import Handler from './Handler';
import HandlerStore from './HandlerStore';
import Context from './Context';
import Message from './Message';
import trimStart from 'lodash/trimStart';
import Router from './Router';

class Plugin {
  constructor(namespace = '', routes = []) {
    this.namespace = namespace;
    this.router = new Router();
    this.router.addRoutes(routes);
    this.subscribers = {};
  }

  connect(transport) {
    this.transport = transport;
    this.transport.onMessage(this.handleIncomingMessage);
  }

  disconnect() {
    this.transport.removeListener('message', this.handleIncomingMessage);
    this.transport = null;
  }

  subscribe(topic, subscriber) {
    const handler = this.createHandler(subscriber);

    if (!this.subscribers[topic]) {
      this.subscribers[topic] = new HandlerStore();
    }

    this.subscribers[topic].add(handler);

    return () => this.subscribers[topic].remove(handler);
  }

  trimNamespace(topic) {
    return this.namespace ? topic.replace(new RegExp(`^${this.namespace}.`), '') : topic;
  }

  send(...args) {
    return this.transport.send(
      this.handleOutgoingMessage(
        this.createMessage(...args)
      )
    );
  }

  publish(...args) {
    return this.transport.publish(
      this.handleOutgoingMessage(
        this.createMessage(...args)
      )
    );
  }

  extract(path) {
    const send = this.send.bind(this);
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

  handleOutgoingMessage(message) {
    const { topic } = message;
    const route = this.router.route(topic);

    if (route) {
      return Object.assign(message, { topic: route });
    }

    if (!this.subscribers[topic]) {
      throw new Error(`Can't handle "${topic}" topic!`);
    }

    return Object.assign(message, {
      topic: trimStart(`${this.namespace}.${message.topic}`, '.'),
    });
  }

  handleIncomingMessage = async (message) => {
    const topic = this.trimNamespace(message.topic);

    if (!this.subscribers[topic]) {
      return;
    }

    const { id } = message;

    const context = this.createContext(message);

    if (message.acknowledge) {
      try {
        const result = await this.subscribers[topic].run(context);
        this.transport.reply({ id, result });
      } catch (error) {
        this.transport.reply({ id, error });
      }
    } else {
      try {
        await this.subscribers[topic].run(context);
      } catch (error) {
        this.transport.emit('error', error);
      }
    }
  }

  createMessage(...args) {
    let params = {};

    if (typeof args[0] === 'string') {
      params.topic = args[0];
      params.data = args[1];
    } else {
      params = args[0];
    }

    if (params instanceof Message) {
      return params;
    }

    return new Message(params);
  }

  createContext(message) {
    return new Context({
      message,
      plugin: this,
    });
  }

  createHandler(fn) {
    if (fn instanceof Handler) {
      return fn;
    }

    return new Handler(fn);
  }
}

export default Plugin;
