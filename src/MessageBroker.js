import HandlerStore from './HandlerStore';
import Context from './Context';

class MessageBroker {
  constructor(transport) {
    this.subscribers = {};
    this.transport = transport;

    this.transport.onMessage(async (message) => {
      const { topic, id } = message;
      if (!this.subscribers[topic]) {
        return;
      }

      const context = new Context({
        message,
        broker: this,
      });

      if (message.acknowledge) {
        try {
          const result = await this.subscribers[topic].run(context);
          this.transport.reply({ id, result });
        } catch (error) {
          this.transport.reply({ id, error });
        }
      } else {
        try {
          await this.subscribers[topic].run(context);
        } catch (error) {
          this.transport.emit('error', error);
        }
      }
    });
  }

  subscribe(topic, subscriber) {
    if (!this.subscribers[topic]) {
      this.subscribers[topic] = new HandlerStore();
    }

    this.subscribers[topic].add(subscriber);

    return () => this.subscribers[topic].remove(subscriber);
  }

  send(message) {
    this._checkSubscribers(message.topic);
    return this.transport.send(message);
  }

  publish(message) {
    this._checkSubscribers(message.topic);
    return this.transport.publish(message);
  }

  _checkSubscribers(topic) {
    if (!this.subscribers[topic]) {
      throw new Error(`No subscribers registered for the ${topic} topic.`);
    }
  }
}

export default MessageBroker;
