import Message from './Message';

class EventDispatcher {
  constructor(broker, historyStore) {
    this.broker = broker;
    this.historyStore = historyStore;
  }

  dispatch(event, params) {
    this.historyStore.add(event, params);
    const message = new Message(event, params);
    return this.broker.send(message);
  }
}

export default EventDispatcher;
