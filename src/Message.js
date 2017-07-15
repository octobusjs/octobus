import Joi from 'joi';
import pick from 'lodash/pick';
import uuid from 'uuid';

class Message {
  static parse = args =>
    Joi.attempt(
      {
        ...args,
        timestamp: args.timestamp || Date.now(),
        id: args.id || uuid.v1(),
      },
      {
        topic: Joi.string().required(),
        data: Joi.any(),
        parentId: Joi.any(),
        id: Joi.any(),
        timestamp: Joi.number(),
        acknowledge: Joi.boolean().default(true),
        result: Joi.any(),
        error: Joi.object().type(Error),
      }
    );

  static create = (...args) => {
    let params = {};

    if (typeof args[0] === 'string') {
      params.topic = args[0];
      params.data = args[1];
    } else {
      params = args[0];
    }

    return new Message(Message.parse(params));
  };

  static serialize = msg =>
    pick(msg, ['topic', 'data', 'parentId', 'id', 'timestamp', 'acknowledge', 'result', 'error']);

  static fork = msg => ({
    ...pick(msg, ['topic', 'data', 'acknowledge']),
    parentId: msg.id,
  });

  static clone = msg => ({
    ...Message.serialize(msg),
    id: uuid.v1(),
  });

  constructor(args = {}) {
    Object.assign(this, Message.parse(args));
  }

  toJSON() {
    return Message.serialize(this);
  }

  fork(args = {}) {
    const message =
      args instanceof Message
        ? args
        : new Message({
          topic: this.topic,
          data: this.data,
          acknowledge: this.acknowledge,
          ...args,
        });

    message.parentId = this.id;

    return message;
  }

  clone(args = {}) {
    return new Message({
      ...this.toJSON(),
      ...args,
    });
  }
}

export default Message;
