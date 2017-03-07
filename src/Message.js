import pick from 'lodash/pick';
import uuid from 'uuid';

class Message {
  constructor({ topic, data, parentId, id, acknowledge = true }) {
    if (!topic) {
      throw new Error('Topic is required when creating a new message!');
    }

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
    const message = params instanceof Message ?
      params :
      new Message({
        topic: this.topic,
        data: this.data,
        acknowledge: this.acknowledge,
        ...params,
      });

    message.parentId = this.id;

    return message;
  }
}

export default Message;
