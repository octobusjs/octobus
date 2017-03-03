class SubscribersList {
  constructor(items = []) {
    this.items = items;
  }

  add(item) {
    this.items.unshift(item);
    return this;
  }

  remove(item) {
    this.items = this.items.filter((_item) => _item !== item);
  }

  run(message) {
    this.doRun(message, [].concat(this.items));
  }

  doRun = (message, subscribers) => {
    const subscriber = subscribers.shift();
    const next = subscribers.length ?
      (nextMessage) => this.doRun(nextMessage, subscribers) :
      undefined;

    return subscriber.run({
      next, message,
    });
  }
}

export default SubscribersList;
