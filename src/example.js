import EventDispatcher from './EventDispatcher';
import MessageBroker from './MessageBroker';
import EventStore from './EventStore';
import MessageSubscriber from './MessageSubscriber';

const broker = new MessageBroker();

broker.subscribe('say.hello', new MessageSubscriber(
  ({ message }) => `Hello, ${message.data.name}`,
));

const dispatcher = new EventDispatcher(
  broker,
  new EventStore(),
);

(async () => {
  const answer = await dispatcher.dispatch('say.hello', { name: 'John' });
  console.log(answer);
})();
