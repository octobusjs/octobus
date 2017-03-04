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

  add({ topic, id, timestamp }) {
    this.history.push({ topic, id, timestamp });
  }
}

export default EventStore;
