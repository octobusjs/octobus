class HandlerStore {
  constructor(items = []) {
    this.items = items;
  }

  add(item) {
    this.items.unshift(item);
    return this;
  }

  remove(item) {
    this.items = this.items.filter(_item => _item !== item);
    return this;
  }

  hasItems() {
    return this.items.length;
  }

  run(context) {
    return this.doRun(context, [].concat(this.items));
  }

  doRun = (context, handlers) => {
    const handler = handlers.shift();

    if (handlers.length) {
      Object.assign(context, {
        next: data => this.doRun(context.clone(data), handlers),
      });
    }

    return handler.run(context);
  };
}

export default HandlerStore;
