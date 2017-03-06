import pick from 'lodash/pick';
import uuid from 'uuid';

class Message {
  constructor({ topic, data, parentId, id, acknowledge = true }) {
    this.topic = topic;
    this.data = data;
    this.parentId = parentId;
    this.timestamp = Date.now();
    this.id = id || uuid.v1();
    this.acknowledge = acknowledge;
  }

  toJSON() {
    return pick(this, ['topic', 'data', 'id']);
  }

  fork(params = {}) {
    return new Message({
      topic: this.topic,
      data: this.data,
      parentId: this.id,
      acknowledge: this.acknowledge,
      ...params,
    });
  }
}

export default Message;
