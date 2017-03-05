import pick from 'lodash/pick';
import uuid from 'uuid';

class Message {
  constructor({ topic, data, parentId, acknowledge = true }) {
    this.topic = topic;
    this.data = data;
    this.parentId = parentId;
    this.timestamp = Date.now();
    this.id = uuid.v1();
    this.acknowledge = acknowledge;
  }

  toJSON() {
    return pick(this, ['topic', 'data', 'id']);
  }
}

export default Message;
