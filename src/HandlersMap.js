import sortBy from 'lodash/sortBy';

export default class HandlersMap extends Map {
  add(key, handler, config = {}) {
    if (!this.has(key)) {
      this.set(key, []);
    }

    if (!config.priority) {
      config.priority = this.get(key).length + 1; // eslint-disable-line
    }

    this.get(key).unshift({
      handler,
      config,
    });
  }

  getByPriority(key) {
    return sortBy(this.get(key), ({ config: { priority } }) => -1 * priority);
  }

  remove(key, handler = null) {
    if (!this.has(key)) {
      return false;
    }

    if (!handler) {
      this.delete(key);
    } else {
      const index = this.get(key).findIndex(({ handler: _handler }) => handler === _handler);
      if (index > -1) {
        this.get(key).splice(index, 1);
      }
    }

    return true;
  }
}
