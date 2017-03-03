/**
 * @TODO
 * should extend EventEmitter
 * store.on('event', saveToStorageEngine);
 * could also use batched saving
 */

class EventStore {
  constructor() {
    this.history = [];
  }

  add({ channel, id, timestamp }) {
    this.history.push({ channel, id, timestamp });
  }
}

export default EventStore;
