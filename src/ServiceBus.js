import Handler from './Handler';
import HandlerStore from './HandlerStore';
import Context from './Context';
import Message from './Message';
import trimStart from 'lodash/trimStart';
import Router from './Router';
import { applyDecorators } from './utils';

class ServiceBus {
  constructor(namespace = '', routes = []) {
    this.namespace = namespace;
    this.router = new Router();
    this.router.addRoutes(routes);
    this.subscribers = {};
  }

  connect(messageBus) {
    this.messageBus = messageBus;
    this.messageBus.onMessage(this.handleIncomingMessage);
  }

  disconnect() {
    this.messageBus.removeListener('message', this.handleIncomingMessage);
    this.messageBus = null;
  }

  subscribe(topic, subscriber) {
    const handler = this.createHandler(subscriber);

    if (!this.subscribers[topic]) {
      this.subscribers[topic] = new HandlerStore();
    }

    this.subscribers[topic].add(handler);

    return () => this.subscribers[topic].remove(handler);
  }

  register(...args) {
    let prefix;
    let container;
    if (args.length === 1) {
      container = args[0];
      prefix = container.constructor.name;
    } else if (args.length === 2) {
      prefix = args[0];
      container = args[1];
    }

    for (const propr in container) {
      if (
        (typeof container[propr] === 'function') &&
        container[propr].isService
      ) {
        const config = container[propr].serviceConfig;
        const fn = container[propr];
        let handler = ({ message, send }) => { // eslint-disable-line
          return fn.call(new Proxy(container, {
            get(target, methodName) {
              if (!target[methodName].isService) {
                return target[methodName];
              }
              return (params) => send(`${prefix}.${methodName}`, params);
            },
          }), message.data);
        };

        if (config.decorators.length) {
          handler = applyDecorators(config.decorators, handler);
        }

        this.subscribe(`${prefix}.${config.name}`, handler);

        container[propr] = (params) => this.send(`${prefix}.${propr}`, params);
        container[propr].isService = true;
      }
    }
  }

  trimNamespace(topic) {
    return this.namespace ? topic.replace(new RegExp(`^${this.namespace}.`), '') : topic;
  }

  send(...args) {
    return this.messageBus.send(
      this.handleOutgoingMessage(
        this.createMessage(...args)
      )
    );
  }

  publish(...args) {
    return this.messageBus.publish(
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
    if (this.router.matches(message)) {
      return this.router.transform(message);
    }

    if (!this.subscribers[message.topic]) {
      throw new Error(`Can't handle "${message.topic}" topic!`);
    }

    return Object.assign(message, {
      topic: trimStart(`${this.namespace}.${message.topic}`, '.'),
    });
  }

  handleIncomingMessage = async (msg) => {
    const message = new Message(msg);
    const topic = this.trimNamespace(message.topic);

    if (!this.subscribers[topic]) {
      return;
    }

    const { id } = message;

    const context = this.createContext(message);

    if (message.acknowledge) {
      try {
        const result = await this.subscribers[topic].run(context);
        this.messageBus.reply({ id, result });
      } catch (error) {
        this.messageBus.reply({ id, error });
      }
    } else {
      try {
        await this.subscribers[topic].run(context);
      } catch (error) {
        this.messageBus.emit('error', error);
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

export default ServiceBus;
