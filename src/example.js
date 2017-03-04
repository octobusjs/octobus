import MessageBroker from './MessageBroker';
import EventStore from './EventStore';
import MessageSubscriber from './MessageSubscriber';
import MessageTransport from './transports/EventEmitter';
import Message from './Message';

const store = new EventStore();
const transport = new MessageTransport();

transport.onMessage((message) => store.add(message));
transport.onMessage((message) => {
  console.log(message);
});

const broker = new MessageBroker(transport);

broker.subscribe('say.something.else', new MessageSubscriber(
  () => 'Something else!'
));

broker.subscribe('say.something', new MessageSubscriber(
  async ({ send }) => {
    console.log(await send(new Message('say.something.else')));
    return 'Something!';
  }
));

broker.subscribe('say.hello', new MessageSubscriber(
  async ({ message, send }) => {
    await send(new Message('say.something'));
    return `${message.data.msg}!`;
  },
));

broker.subscribe('say.hello', new MessageSubscriber(
  ({ message, next, send, lookup }) => { // eslint-disable-line
    // const User = lookup('user.User'); // eslint-disable-line
    return next({
      msg: `Hello, ${message.data.name}`,
    });
  },
));

(async () => {
  const msg = new Message('say.hello', { name: 'John' });
  const answer = await broker.send(msg);
  console.log(answer); // eslint-disable-line
})();
