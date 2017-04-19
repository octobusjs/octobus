import EventEmitter from 'events';
import RealTimeTransport from './transports/RealTime';
import TransportRouter from './routing/TransportRouter';

class MessageBus extends EventEmitter {
  static defaultOptions = {
    replyTimeout: 2000,
  };

  static createDefaultRouter(routes) {
    return new TransportRouter(
      routes || [
        {
          matcher: /.*/,
          transport: new RealTimeTransport(),
        },
      ],
    );
  }

  constructor(router = MessageBus.createDefaultRouter(), options = {}) {
    super();
    this.setMaxListeners(Infinity);
    this.router = router;
    this.options = {
      ...MessageBus.defaultOptions,
      ...options,
    };

    this.router.getRoutes().forEach(({ transport }) => {
      transport.onMessage((...args) => this.emit('message', ...args));
    });
  }

  onMessage(handler) {
    this.on('message', handler);
    return () => this.removeListener('message', handler);
  }

  routeMessage(rawMessage) {
    const route = this.router.findRoute(rawMessage);
    if (!route) {
      throw new Error(`Unable to find matching route for topic "${rawMessage.topic}"`);
    }
    const { transport } = route;
    const message = this.router.process(rawMessage);
    return { transport, message };
  }

  send(rawMessage) {
    const { message, transport } = this.routeMessage(rawMessage);
    let ret = Promise.resolve(true);
    let removeReplyListener;

    if (message.acknowledge) {
      ret = new Promise((resolve, reject) => {
        // eslint-disable-next-line prefer-const
        let timeoutId;
        const onReply = ({ id, result, error }) => {
          if (id !== message.id) {
            return;
          }

          if (error) {
            reject(error);
          } else {
            resolve(result);
          }

          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          removeReplyListener();
        };

        timeoutId = setTimeout(() => {
          removeReplyListener();
          reject(new Error(`Waiting too long for message id's "${message.id}" reply!`));
        }, this.options.replyTimeout);

        removeReplyListener = transport.onReply(onReply);
      });
    }

    transport.sendMessage(message.toJSON());

    return ret;
  }

  publish(message) {
    Object.assign(message, {
      acknowledge: false,
    });

    return this.send(message);
  }

  reply(rawMessage) {
    const { message, transport } = this.routeMessage(rawMessage);
    transport.sendReply(message);
  }
}

export default MessageBus;
