import Handler from './Handler';
import HandlerStore from './HandlerStore';
import Context from './Context';
import Message from './Message';
import trimStart from 'lodash/trimStart';
import Router from './routing/Router';
import { applyDecorators } from './utils';

class ServiceBus {
  static isService(fn) {
    return typeof fn === 'function' && fn.isService;
  }

  constructor(namespace = '', routes = []) {
    this.namespace = namespace;
    this.router = new Router();
    this.router.addRoutes(routes);
    this.subscribers = {};
  }

  connect(messageBus) {
    this.messageBus = messageBus;
    this.doDisconnect = this.messageBus.onMessage(this.handleIncomingMessage);
  }

  disconnect() {
    this.doDisconnect();
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
    const { isService } = this.constructor;
    let prefix;
    let container;
    if (args.length === 1) {
      container = args[0];
      prefix = container.constructor.name;
    } else if (args.length === 2) {
      prefix = args[0];
      container = args[1];
    }

    if (typeof container.setServiceBus === 'function') {
      container.setServiceBus(this);
    }

    for (const propr in container) {
      if (isService(container[propr])) {
        const config = container[propr].serviceConfig;
        const fn = container[propr];
        // eslint-disable-next-line
        let handler = handlerArgs => {
          return fn.call(
            new Proxy(container, {
              get(target, methodName) {
                if (!isService(target[methodName])) {
                  return target[methodName];
                }
                return params => handlerArgs.send(`${prefix}.${methodName}`, params);
              },
            }),
            handlerArgs.message.data,
            handlerArgs,
          );
        };

        if (config.decorators.length) {
          handler = applyDecorators(config.decorators, handler);
        }

        this.subscribe(`${prefix}.${config.name}`, handler);

        container[propr] = params => this.send(`${prefix}.${propr}`, params);
        container[propr].isService = true;
      }
    }

    return container;
  }

  trimNamespace(topic) {
    return this.namespace ? topic.replace(new RegExp(`^${this.namespace}.`), '') : topic;
  }

  send(...args) {
    return this.messageBus.send(this.handleOutgoingMessage(this.createMessage(...args)));
  }

  publish(...args) {
    return this.messageBus.publish(this.handleOutgoingMessage(this.createMessage(...args), true));
  }

  extract(path) {
    const send = this.send.bind(this);
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
  }

  handleOutgoingMessage(message, ignoreSubscribers = false) {
    if (this.router.findRoute(message)) {
      return this.router.process(message);
    }

    if (!ignoreSubscribers && !this.subscribers[message.topic]) {
      throw new Error(`Can't handle "${message.topic}" topic!`);
    }

    return Object.assign(message, {
      topic: trimStart(`${this.namespace}.${message.topic}`, '.'),
    });
  }

  handleIncomingMessage = async msg => {
    const message = new Message(msg);
    const topic = this.trimNamespace(message.topic);

    if (!this.subscribers[topic]) {
      return;
    }

    const context = this.createContext(message);

    if (message.acknowledge) {
      try {
        message.result = await this.subscribers[topic].run(context);
      } catch (error) {
        message.error = error;
      }

      this.messageBus.reply(message);
    } else {
      try {
        await this.subscribers[topic].run(context);
      } catch (error) {
        this.messageBus.emit('error', error);
      }
    }
  };

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
      serviceBus: this,
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
