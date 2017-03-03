import EventDispatcher from './EventDispatcher';
import MessageBroker from './MessageBroker';
import EventStore from './EventStore';
import MessageSubscriber from './MessageSubscriber';
import MessageTransport from './MessageTransport';

const store = new EventStore();
const transport = new MessageTransport();

transport.onMessage((message) => store.add(message));

const broker = new MessageBroker(transport);

broker.subscribe('say.hello', new MessageSubscriber(
  ({ message }) => `Hello, ${message.data.name}`,
));

const dispatcher = new EventDispatcher(broker, store);

(async () => {
  const answer = await dispatcher.dispatch('say.hello', { name: 'John' });
  console.log(answer);
})();
