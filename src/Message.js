import pick from 'lodash/pick';
import uuid from 'uuid/v1';

class Message {
  constructor(topic, data, parentId) {
    this.topic = topic;
    this.data = data;
    this.parentId = parentId;
    this.timestamp = Date.now();
    this.id = uuid();
  }

  toJSON() {
    return pick(this, ['topic', 'data', 'id']);
  }
}

export default Message;
