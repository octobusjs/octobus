/**
 * should extend EventEmitter
 * store.on('event', saveToStorageEngine);
 * could also use batched saving
 */

class EventStore {
  constructor() {
    this.history = [];
  }

  add(event, params) {
    this.history.push({ event, params });
  }
}

export default EventStore;
