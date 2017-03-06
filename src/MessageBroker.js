import HandlerStore from './HandlerStore';
import Context from './Context';
import Message from './Message';

class MessageBroker {
  constructor(forwardPatterns = []) {
    this.subscribers = {};
    this.forwardPatterns = forwardPatterns.map((pattern) => new RegExp(pattern));
  }

  connect(transport) {
    this.transport = transport;
    this.transport.onMessage(this.handleIncomingMessage);
  }

  disconnect() {
    this.transport.removeListener('message', this.handleIncomingMessage);
    this.transport = null;
  }

  addForwardPatterns(patterns) {
    this.forwardPatterns.concat(
      patterns.map((pattern) => new RegExp(pattern))
    );
  }

  subscribe(topic, subscriber) {
    if (!this.subscribers[topic]) {
      this.subscribers[topic] = new HandlerStore();
    }

    this.subscribers[topic].add(subscriber);

    return () => this.subscribers[topic].remove(subscriber);
  }

  send(message) {
    this.verifyTopic(message.topic);
    return this.transport.send(message);
  }

  publish(message) {
    this.verifyTopic(message.topic);
    return this.transport.publish(message);
  }

  extract(path) {
    const send = this.send.bind(this);
    return new Proxy({}, {
      get(target, methodName) {
        return (data) => {
          const topic = `${path}.${methodName}`;
          const message = new Message({ topic, data });
          return send(message);
        };
      },
    });
  }

  isForwardable(topic) {
    return this.forwardPatterns.some((pattern) => pattern.test(topic));
  }

  verifyTopic(topic) {
    if (
      !this.subscribers[topic] &&
      !this.isForwardable(topic)
    ) {
      throw new Error(`No subscribers registered for the ${topic} topic.`);
    }
  }

  handleIncomingMessage = async (message) => {
    const { topic, id } = message;
    if (!this.subscribers[topic] || this.isForwardable(topic)) {
      return;
    }

    const context = this.createContext(message);

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
  }

  createContext(message) {
    return new Context({
      message,
      broker: this,
    });
  }
}

export default MessageBroker;
