import pick from 'lodash/pick';
import uuid from 'uuid/v1';

class Message {
  constructor(channel, data, parentId) {
    this.channel = channel;
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

  toJSON() {
    return pick(this, ['channel', 'data', 'id']);
  }
}

export default Message;
