import SubscribersList from './SubscribersList';
import Message from './Message';

class MessageBroker {
  constructor(transport) {
    this.subscribers = {};
    this.transport = transport;

    this.transport.onMessage(async ({ channel, data, id }) => {
      const result = await this.subscribers[channel].run(data);
      this.transport.reply({ id, result });
    });
  }

  subscribe(channel, subscriber) {
    if (!this.subscribers[channel]) {
      this.subscribers[channel] = new SubscribersList();
    }

    this.subscribers[channel].add(subscriber);

    return () => this.subscribers[channel].remove(subscriber);
  }

  send(channel, data) {
    if (!this.subscribers[channel]) {
      return Promise.reject(new Error(`No subscribers registered for the ${channel} channel.`));
    }

    const message = new Message(channel, data);

    this.transport.send(message);

    return new Promise((resolve, reject) => {
      this.transport.onReply(({ id, result }) => {
        if (id === message.id) {
          resolve(result);
        }
      });

      this.transport.onError(({ id, error }) => {
        if (id === message.id) {
          reject(error);
        }
      });
    });
  }
}

export default MessageBroker;
