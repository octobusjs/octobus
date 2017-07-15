Let's write a simple function that calculates the CPM out of a price and a nr of impressions by the formula `CPM = (cost / impressions) * 1000`.

```js
function cpm(cost, impressions) {
  return (cost / impressions) * 1000;
}
```

Let's make it look nicer using arrow functions:

```js
const cpm = (cost, impressions) => {
  return (cost / impressions) * 1000;
};
```

...and shorter with implicit return:

```js
const cpm = (cost, impressions) => (cost / impressions) * 1000;
```

If you are like me, you'll always forget the position of the parameters (does the cost argument come first?).

PHP knows it better - http://phpsadness.com/sad/9 - positional parameters suck, so let's simulate named parameters:

```js
const cpm = ({ cost, impressions }) => (cost / impressions) * 1000;
```

Cool, now let's say we published a library featuring our CPM calculator. But someone using it realizes he's getting infinite CPMs. It happens when we have zero impressions - the CPM should be zero too.
He has to wrap our function and change all the calls to it with his wrapped version:


```js
import { cpm } from 'cpm-calculator';

export default ({ cost, impressions }) => impressions === 0 ? 0 : cpm({ cost, impressions });
```

He realizes there's more than that. The cost and impressions can't be negative numbers, while the impressions number has to be a natural number.
But... he already worked hard on replacing the initial cpm calls with his previous version.

Let's see how octobus can help him in this case.

First we need a MessageBus that will act as a central dispatcher of the messages we're about to send.

```js
import { MessageBus } from 'octobus.js';
const messageBus = new MessageBus();
```

While you can send messages through the messageBus directly, you'll want to use a ServiceBus most of the time especially because it gives you more control on the type of messages you can send, but it also provides a nicer way to subscribe and react to different messages.

```js
import { ServiceBus } from 'octobus.js';
const serviceBus = new ServiceBus();
```

The serviceBus needs to be connected to the messageBus instance to be able to send / receive messages.

```js
serviceBus.connect(messageBus);
```

Now we can subscribe to message topics:

```js
serviceBus.subscribe('say.hello', () => 'Hello, world!');
```

Let's try to send a message and see what happens:

```js
serviceBus.send('say.hello').then((result) => {
  expect(result).toBe('Hello, world!');
});
```

Great, it worked.
Now let's use use what we learned for our cpm calculation logic.
First we need to be able to get access to the passed arguments. The handler receives the message (along with its data payload) in a special `message` named argument:

```js
serviceBus.subscribe('calculator.cpm', ({ message }) => {
  const { data } = message;
  return (data.cost / data.impressions) * 1000);
});
```

And this is how you can send a message with a payload:

```js
serviceBus.send('calculator.cpm', { cost: 22, impressions: 100 }).then((result) => {
  expect(result).to.equal(220);
});
```

Now let's say you want to get 0 as a result when the impressions number is 0. You can overwrite the previously defined service by creating another under the same topic:

```js
serviceBus.subscribe('calculator.cpm', ({ message }) => {
  const { cost, impressions } = message.data;

  if (impressions === 0) {
    return 0;
  }

  return (cost / impressions) * 1000);
});
```

But you might want to call the previously defined service, instead of copy-pasting the code. You do that with a `next` function call, similar to `super` calls from class inheritance.
```js
serviceBus.subscribe('calculator.cpm', ({ message, next }) => {
  const { cost, impressions } = message.data;

  if (impressions === 0) {
    return 0;
  }

  return next({ cost, impressions });
});
```

The destructuring under the `params` parameter looks confusing. Would be nice if we could have the parameters under the main object argument, like this:
```js
const handler = ({ cost, impressions, next }) => impressions === 0 ? 0 : next({ cost, impressions });
```

You can actually do that using something called `decorators`. These are high-order functions for handlers, and act as middlewares sitting between the dispatching and event and executing the handler's logic.

```js
import { decorators } from 'octobus.js';

const { withHandler } = decorators;

// same as above
subscribe('calculator.cpm', withHandler(handler));
```
