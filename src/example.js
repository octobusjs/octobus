import MessageBroker from './MessageBroker';
import EventStore from './EventStore';
import Handler from './Handler';
import MessageTransport from './transports/EventEmitter';
import Message from './Message';
import range from 'lodash/range';

const store = new EventStore();
const transport = new MessageTransport();

transport.onMessage((message) => store.add(message));
// transport.onMessage((message) => {
//   console.log(message);
// });

const broker = new MessageBroker(transport);
const broker2 = new MessageBroker(transport);

broker2.subscribe('say.something.else', new Handler(
  ({ reply }) => {
    reply('Something else!');
  }
));

broker.subscribe('say.something', new Handler(
  async () => { // eslint-disable-line
    // try {
    //   const result = await lookup('say.something').else();
    //   console.log(result);
    //   return result;
    // } catch (err) {
    //   console.log(err);
    //   throw err;
    // }
    return transport.send(new Message({ topic: 'say.something.else' }));
  }
));

broker.subscribe('say.hello', new Handler(
  async ({ message, send }) => {
    try {
      await send(new Message({ topic: 'say.something' }));
    } catch (e) {
      console.log(e);
    }
    return `${message.data.msg}!`;
  },
));

broker.subscribe('say.hello', new Handler(
  ({ message, next, send, lookup }) => { // eslint-disable-line
    // const User = lookup('user.User'); // eslint-disable-line
    return next({
      msg: `Hello, ${message.data.name}`,
    });
  },
));

const run = async () => {
  const start = Date.now();

  Promise.all(
    range(1000).map(async () => {
      const msg = new Message({ topic: 'say.hello', data: { name: 'John' } });
      const answer = await broker.send(msg);
      // console.log(answer); // eslint-disable-line
      return answer;
    })
  ).then(() => {
    console.log(Date.now() - start); // eslint-disable-line
  });
};

setTimeout(async () => {
  try {
    await run();
  } catch (err) {
    console.log(err); // eslint-disable-line
  }
}, 0);
