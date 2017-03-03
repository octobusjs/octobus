import EventEmitter from 'events';

class MessageTransport extends EventEmitter {
  constructor(errorHandler = () => {}) {
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

  send(...args) {
    this.emit('message', ...args);
  }

  reply(...args) {
    this.emit('reply', ...args);
  }
}

export default MessageTransport;
