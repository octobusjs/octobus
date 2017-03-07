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
}

export default Transport;
