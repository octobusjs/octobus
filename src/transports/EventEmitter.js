import NodeEventEmitter from 'events';

class EventEmitter extends NodeEventEmitter {
  constructor(errorHandler = () => {}) {
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
    const promise = new Promise((resolve, reject) => {
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

    this.emit('message', message);

    return promise;
  }

  reply(...args) {
    this.emit('reply', ...args);
  }
}

export default EventEmitter;
