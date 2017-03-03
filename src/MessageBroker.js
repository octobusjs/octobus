import SubscribersList from './SubscribersList';

class MessageBroker {
  constructor() {
    this.subscribers = {};
  }

  subscribe(topic, subscriber) {
    if (!this.subscribers[topic]) {
      this.subscribers[topic] = new SubscribersList();
    }

    this.subscribers[topic].add(subscriber);

    return () => {
      this.subscribers[topic].remove(subscriber);
    };
  }

  send(message) {
    if (!this.subscribers[message.topic]) {
      return Promise.reject(new Error(`No subscribers registered for the ${message.topic} topic.`));
    }

    return this.subscribers[message.topic].run(message);
  }
}

export default MessageBroker;
