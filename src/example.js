import MessageBroker from './MessageBroker';
import EventStore from './EventStore';
import MessageSubscriber from './MessageSubscriber';
import MessageTransport from './transports/EventEmitter';
import Message from './Message';

const store = new EventStore();
const transport = new MessageTransport();

transport.onMessage((message) => store.add(message));

const broker = new MessageBroker(transport);

broker.subscribe('say.hello', new MessageSubscriber(
  ({ message, next, send, lookup }) => { // eslint-disable-line
    // const User = lookup('user.User'); // eslint-disable-line
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
