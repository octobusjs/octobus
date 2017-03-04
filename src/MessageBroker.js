import SubscribersStore from './SubscribersStore';
import Context from './Context';

class MessageBroker {
  constructor(transport) {
    this.subscribers = {};
    this.transport = transport;

    this.transport.onMessage(async (message) => {
      const { channel, id } = message;
      if (!this.subscribers[channel]) {
        return;
      }

      const context = new Context({
        message,
        broker: this,
      });

      const result = await this.subscribers[channel].run(context);

      this.transport.reply({ id, result });
    });
  }

  subscribe(channel, subscriber) {
    if (!this.subscribers[channel]) {
      this.subscribers[channel] = new SubscribersStore();
    }

    this.subscribers[channel].add(subscriber);

    return () => this.subscribers[channel].remove(subscriber);
  }

  send(message) {
    if (!this.subscribers[message.channel]) {
      return Promise.reject(
        new Error(`No subscribers registered for the ${message.channel} channel.`)
      );
    }

    return this.transport.send(message);
  }
}

export default MessageBroker;
