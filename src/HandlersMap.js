import sortBy from 'lodash/sortBy';

export default class HandlersMap extends Map {
  add(key, handler, priority) {
    if (!this.has(key)) {
      this.set(key, []);
    }

    if (priority === undefined) {
      priority = this.getMaxPriority(key) + 1; // eslint-disable-line no-param-reassign
    }

    this.get(key).unshift({ handler, priority });
  }

  getMaxPriority(key) {
    return (this.get(key) || []).reduce((max, { priority }) => (
      Math.max(priority, max)
    ), 0);
  }

  getByPriority(key) {
    return sortBy(this.get(key), ({ priority }) => -1 * priority).map(({ handler }) => handler);
  }

  remove(key, handler = null) {
    if (!this.has(key)) {
      return false;
    }

    if (!handler) {
      this.delete(key);
    } else {
      const index = this.get(key).findIndex(({ handler: _handler }) => _handler === handler);
      if (index > -1) {
        this.get(key).splice(index, 1);
      }
    }

    return true;
  }
}
