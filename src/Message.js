import pick from 'lodash/pick';
import uuid from 'uuid/v1';

class Message {
  constructor(channel, data, parentId) {
    this.channel = channel;
    this.data = data;
    this.parentId = parentId;
    this.timestamp = Date.now();
    this.id = uuid();
  }

  toJSON() {
    return pick(this, ['channel', 'data', 'id']);
  }
}

export default Message;
