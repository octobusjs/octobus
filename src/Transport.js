import EventEmitter from 'events';

const consoleErrorHandler = (error) => {
  console.log(error); // eslint-disable-line no-console
};

class Transport extends EventEmitter {
  constructor(errorHandler = consoleErrorHandler) {
    super();
    this.setMaxListeners(Infinity);
    this.on('error', errorHandler);
  }

  onMessage(handler) {
    this.on('message', handler);
  }

  onReply(handler) {
    this.on('reply', handler);
  }

  onError(handler) {
    this.on('error', handler);
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

          this.removeListener('reply', onReply);
        };

        this.onReply(onReply);
      });
    }

    this.emit('message', message);

    return ret;
  }

  publish(message) {
    Object.assign(message, {
      acknowledge: false,
    });

    return this.send(message);
  }

  reply(...args) {
    this.emit('reply', ...args);
  }
}

export default Transport;
