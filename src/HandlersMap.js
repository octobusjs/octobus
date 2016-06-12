import sortBy from 'lodash/sortBy';

export default class HandlersMap extends Map {
  add(key, handler) {
    if (!this.has(key)) {
      this.set(key, []);
    }

    if (!handler.getConfig('priority')) {
      handler.setConfig('priority', this.get(key).length + 1);
    }

    this.get(key).unshift(handler);
  }

  getByPriority(key) {
    return sortBy(this.get(key), (handler) => -1 * handler.getConfig('priority'));
  }

  remove(key, handler = null) {
    if (!this.has(key)) {
      return false;
    }

    if (!handler) {
      this.delete(key);
    } else {
      const index = this.get(key).findIndex((_handler) => _handler.isEqualTo(handler));
      if (index > -1) {
        this.get(key).splice(index, 1);
      }
    }

    return true;
  }
}
