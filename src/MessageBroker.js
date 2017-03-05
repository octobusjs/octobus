import SubscribersStore from './SubscribersStore';
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

      try {
        const result = await this.subscribers[topic].run(context);
        this.transport.reply({ id, result });
      } catch (error) {
        this.transport.reply({ id, error });
      }
    });
  }

  subscribe(topic, subscriber) {
    if (!this.subscribers[topic]) {
      this.subscribers[topic] = new SubscribersStore();
    }

    this.subscribers[topic].add(subscriber);

    return () => this.subscribers[topic].remove(subscriber);
  }

  send(message) {
    if (!this.subscribers[message.topic]) {
      return Promise.reject(
        new Error(`No subscribers registered for the ${message.topic} topic.`)
      );
    }

    return this.transport.send(message);
  }
}

export default MessageBroker;
