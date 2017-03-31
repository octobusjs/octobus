import BaseTransport from './Base';

class RealTime extends BaseTransport {
  constructor(...cArgs) {
    super(...cArgs);

    this.on('message.sent', (...args) => this.emit('message.received', ...args));
    this.on('reply.sent', (...args) => this.emit('reply.received', ...args));
  }
}

export default RealTime;
