class SubscribersStore {
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

  run(context) {
    return this.doRun(context, [].concat(this.items));
  }

  doRun = (context, subscribers) => {
    const subscriber = subscribers.shift();

    if (subscribers.length) {
      Object.assign(context, {
        next: (data) => {
          Object.assign(context.message.data, data);
          return this.doRun(context, subscribers);
        },
      });
    }

    return subscriber.run(context);
  }
}

export default SubscribersStore;
