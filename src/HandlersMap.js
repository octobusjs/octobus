export default class HandlersMap extends Map {
  set(key, { handler, priority, filename }) {
    if (!this.has(key)) {
      super.set(key, []);
    }

    if (priority === undefined) {
      priority = 1; // eslint-disable-line no-param-reassign
    }

    this.get(key).unshift({ handler, priority, filename });
  }

  delete(key, handler = null) {
    if (!this.has(key)) {
      return false;
    }

    if (!handler) {
      super.delete(key);
    } else {
      const index = this.get(key).findIndex(({ handler: _handler }) => _handler === handler);
      if (index > -1) {
        this.get(key).splice(index, 1);
      }
    }

    return true;
  }
}
