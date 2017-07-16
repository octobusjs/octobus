Let's look at the classic "Hello, world!" example when working with octobus.

```js
import { MessageBus, Message } from 'octobus.js';
import assert from 'assert';

const messageBus = new MessageBus();

messageBus.onMessage(msg => {
  messageBus.reply({
    ...msg,
    result: `Hello, ${msg.data}!`,
  });
});

const message = new Message({
  topic: 'hello',
  data: 'world',
});

messageBus
  .send(message)
  .then(result => {
    assert.equal(result, 'Hello, world!');
  })
  .catch(err => {
    console.log(err);
  });
```

We first create an instance of a MessageBus. We use it to send and receive messages.
Then we set a listener for incoming messages, where we reply with the same message having an additional `result` property. We use the `data` property of the message to get access to the payload that's attached to it.

Then we use the `messageBus` to actually send the message. The `messageBus.send` method will return a promise which we can use to check the result using the assert module.

Let's look at a bit more complex example, which is calculating the sum and difference of 2 numbers.

```js
import { MessageBus, Message } from 'octobus.js';
import assert from 'assert';

const messageBus = new MessageBus();

messageBus.onMessage(msg => {
  switch (msg.topic) {
    case 'sum':
      messageBus.reply({
        ...msg,
        result: msg.data.left + msg.data.right,
      });
      break;
    case 'difference':
      messageBus.reply({
        ...msg,
        result: msg.data.left - msg.data.right,
      });
      break;
    default:
      messageBus.reply({
        ...msg,
        error: new Error(`Unable to handle topic ${msg.topic}!`),
      });
  }
});
```

We notice that we have to tream each topic in a different way.
You can send a sum message like this:

```js
const message = new Message({
  topic: 'sum',
  data: {
    left: 1,
    right: 2,
  },
});

messageBus
  .send(message)
  .then(result => {
    assert.equal(result, 3);
  })
  .catch(err => {
    console.log(err);
  });
```

And for difference:
```js
const message = new Message({
  topic: 'difference',
  data: {
    left: 3,
    right: 2,
  },
});

messageBus
  .send(message)
  .then(result => {
    assert.equal(result, 1);
  })
  .catch(err => {
    console.log(err);
  });
```

But dealing with different topics like this is not scalable.
Wouldn't be great to have a way to group message handlers together.
There is a way - you can use a ServiceBus for that.

```js
import { MessageBus, Message, ServiceBus } from '../src';
import assert from 'assert';

const messageBus = new MessageBus();
const math = new ServiceBus('math');

math.connect(messageBus);

math.subscribe('sum', ({ message }) => message.data.left + message.data.right);
math.subscribe('difference', ({ message }) => message.data.left - message.data.right);

messageBus
  .send(
    new Message({
      topic: 'math.sum', // the topic name is prefixed by our serviceBus namespace (math)
      data: {
        left: 1,
        right: 2,
      },
    })
  )
  .then(result => {
    assert.equal(result, 3);
  })
  .catch(err => {
    console.log(err);
  });
```

More than that, we can use the serviceBus to send the messages.

```js
math
  .send(
    new Message({
      topic: 'sum', // the topic will be prefixed by the serviceBus
      data: {
        left: 1,
        right: 2,
      },
    })
  )
  .then(result => {
    assert.equal(result, 3);
  })
  .catch(err => {
    console.log(err);
  });
```

There's a short version of the `serviceBus.send` method where the first parameter can be a string (topic name), while the second one is the actual payload (message's data).

```js
math
  .send('sum', { left: 1, right: 2 })
  .then(result => {
    assert.equal(result, 3);
  })
  .catch(err => {
    console.log(err);
  });
```

Final example:
```js
import { MessageBus, ServiceBus } from '../src';
import assert from 'assert';

const messageBus = new MessageBus();
const math = new ServiceBus('math');

math.connect(messageBus);

math.subscribe('sum', ({ message }) => message.data.left + message.data.right);
math.subscribe('difference', ({ message }) => message.data.left - message.data.right);

Promise.all([
  math.send('sum', { left: 1, right: 2 }),
  math.send('difference', { left: 3, right: 2 }),
])
  .then(result => {
    assert.ok(Array.isArray(result));
    assert.equal(result[0], 3); // sum
    assert.equal(result[1], 1); // difference
  })
  .catch(err => {
    console.log(err);
  });
```