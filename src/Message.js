import Joi from 'joi';
import pick from 'lodash/pick';
import uuid from 'uuid';

class Message {
  constructor(args = {}) {
    const {
      topic, data, parentId, id, timestamp, acknowledge, result, error,
    } = Joi.attempt(args, {
      topic: Joi.string().required(),
      data: Joi.any(),
      parentId: Joi.any(),
      id: Joi.any(),
      timestamp: Joi.number(),
      acknowledge: Joi.boolean().default(true),
      result: Joi.any(),
      error: Joi.object().type(Error),
    });

    this.topic = topic;
    this.data = data;
    this.parentId = parentId;
    this.timestamp = timestamp || Date.now();
    this.id = id || uuid.v1();
    this.acknowledge = acknowledge;
    this.result = result;
    this.error = error;
  }

  toJSON() {
    return pick(this, [
      'topic', 'data', 'parentId', 'id', 'timestamp', 'acknowledge', 'result', 'error',
    ]);
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

  clone(params = {}) {
    return new Message({
      ...this.toJSON(),
      ...params,
    });
  }
}

export default Message;
