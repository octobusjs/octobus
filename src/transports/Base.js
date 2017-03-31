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
    this.on('message.received', handler);
    return () => this.removeListener('message.received', handler);
  }

  onReply(handler) {
    this.on('reply.received', handler);
    return () => this.removeListener('reply.received', handler);
  }

  sendMessage(message) {
    this.emit('message.sent', message);
  }

  sendReply(...args) {
    this.emit('reply.sent', ...args);
  }
}

export default Transport;
