import Transport from './Transport';

class ServiceBus {
  static defaultOptions = {
    replyTimeout: 2000,
  };

  constructor(transport = new Transport(), options = {}) {
    this.transport = transport;
    this.options = {
      ...ServiceBus.defaultOptions,
      ...options,
    };
  }

  onMessage(handler) {
    this.transport.on('message', handler);
  }

  send(message) {
    let ret = Promise.resolve(true);

    if (message.acknowledge) {
      ret = new Promise((resolve, reject) => {
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

          this.transport.removeListener('reply', onReply);
        };

        timeoutId = setTimeout(() => { // eslint-disable-line prefer-const
          this.transport.removeListener('reply', onReply);
          reject(new Error(`Waiting too long for message id's "${message.id}" reply!`));
        }, this.options.replyTimeout);

        this.transport.on('reply', onReply);
      });
    }

    this.transport.emit('message', message.toJSON());

    return ret;
  }

  publish(message) {
    Object.assign(message, {
      acknowledge: false,
    });

    return this.send(message);
  }

  reply(...args) {
    this.transport.emit('reply', ...args);
  }
}

export default ServiceBus;
