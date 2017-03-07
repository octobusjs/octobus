import Transport from './Transport';

class ServiceBus {
  constructor(transport = new Transport()) {
    this.transport = transport;
  }

  onMessage(handler) {
    this.transport.on('message', handler);
  }

  send(message) {
    let ret = Promise.resolve(true);

    if (message.acknowledge) {
      ret = new Promise((resolve, reject) => {
        const onReply = ({ id, result, error }) => {
          if (id !== message.id) {
            return;
          }

          if (error) {
            reject(error);
          } else {
            resolve(result);
          }

          this.transport.removeListener('reply', onReply);
        };

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
