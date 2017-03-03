import pick from 'lodash/pick';
import uuid from 'uuid/v1';

class Message {
  constructor(topic, data, parentId) {
    this.topic = topic;
    this.data = data;
    this.parentId = parentId;
    this.timestamp = Date.now();
    this.id = uuid();
    this.inProgress = true;
    this.isStopped = false;
    this.returnValue = undefined;
    this.error = undefined;
  }

  reply(value) {
    this.returnValue = value;
    this.inProgress = false;
  }

  replyError(error) {
    this.error = error;
    this.inProgress = false;
  }

  stopPropagation() {
    this.isStopped = true;
  }

  toString() {
    return this.topic;
  }

  toJSON() {
    return pick(this, ['topic', 'data', 'id']);
  }

  clone(event) {
    const { topic, data, id } = event.toJSON();
    return new Event(topic, data, id);
  }
}

export default Message;
