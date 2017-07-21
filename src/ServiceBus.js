import Handler from './Handler';
import HandlerStore from './HandlerStore';
import Context from './Context';
import Message from './Message';
import Router from './routing/Router';
import { applyDecorators } from './utils';

class ServiceBus {
  static isService(fn) {
    return typeof fn === 'function' && fn.isService;
  }

  constructor(namespace = '', routes = []) {
    this.namespace = namespace;
    this.router = new Router(routes);
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
            handlerArgs
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
      }
    );
  }

  handleOutgoingMessage(message, ignoreSubscribers = false) {
    const route = this.router.findRoute(message);
    if (route) {
      return route.transform(message);
    }

    if (
      !ignoreSubscribers &&
      (!this.subscribers[message.topic] || !this.subscribers[message.topic].hasItems())
    ) {
      throw new Error(`Can't handle "${message.topic}" topic!`);
    }

    if (this.namespace) {
      Object.assign(message, {
        topic: `${this.namespace}.${message.topic}`,
      });
    }

    return message;
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
    return args[0] instanceof Message ? args[0] : Message.create(...args);
  }

  createContext(message) {
    return new Context({
      message,
      serviceBus: this,
    });
  }

  createHandler(fn) {
    return fn instanceof Handler ? fn : new Handler(fn);
  }
}

export default ServiceBus;
