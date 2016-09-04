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

If you are like me, you'll always forget the position of the parameters (does the cost come first?).

PHP knows it better - http://phpsadness.com/sad/9 - positional parameters suck, so let's simulate named parameters:

```js
const cpm = ({ cost, impressions }) => (cost / impressions) * 1000;
```

Cool, now let's say you published a library featuring your CPM calculator. But someone using it realizes he's getting infinite CPMs. It happens when you have 0 impressions - the CPM should be 0 too.
He has to wrap your function and change all the calls to your function with his wrapped function:


```js
import { cpm } from 'cpm-calculator';

export default ({ cost, impressions }) => impressions === 0 ? 0 : cpm({ cost, impressions });
```

He realizes there's more than that. The cost and impressions can't be negative numbers, while the impressions number has to be a natural number.
But... you already worked hard on replacing the initial cpm calls with your version where you guard for 0 impressions.

Let's try to do some of that using octobus.js.

First we need a dispatcher instance:

```js
import Octobus from 'octobus.js';
const dispatcher = new Octobus();
const { dispatch, subscribe } = dispatcher;
```

Now we can subscribe to message calls (dispatched events):

```js
subscribe('sayHello', (meta, cb) => {
  cb(null, 'Hello!');
});
```

And then you can dispatch events:

```js
dispatch('sayHello', (err, result) => {
  expect(err).to.be.null();
  expect(result).to.equal('Hello!');
});
```

But callbacks are dead (wait.. no one hasn't written an article on that yet?). Let's use promises.

```js
// here we can use a simple pure function since we don't have any side effects
subscribe('sayHello', () => 'Hello!');

// Dispatch calls always return promises.
dispatch('sayHello').then((result) => {
  expect(err).to.be.null();
  expect(result).to.equal('Hello!');
});
```

Let's use use what we learned for our cpm calculation logic.
First we need to be able to get access to the passed arguments. The handler receives the parameters in a special `params` named parameter:

```js
subscribe('cpm', ({ params }) => (params.cost / params.impressions) * 1000);
```

You can go even further with destructuring assignment:

```js
subscribe('cpm', ({ params: { cost, impressions } }) => (cost / impressions) * 1000);
```

And this is how you can call it:

```js
dispatch('cpm', { cost: 22, impressions: 100 }).then((result) => {
  expect(result).to.equal(220);
});
```

It's better to keep your event names under specific namespaces.
Some good examples:
- `calculator.cpm`
- `logger.error`
- `math.sum`
- `entity.User.findOne`

Now let's say you want to get 0 as a result when the impressions number is 0. You can overwrite the previously defined service by creating another one with the same name:

```js
subscribe('calculator.cpm', ({ params: { cost, impressions } }) => impressions === 0 ? 0 : (cost / impressions) * 1000);
```

But you might want to call the previously defined service, instead of overwriting it. You do that with a `next` function call, similar to `super` calls from class inheritance.
```js
subscribe('calculator.cpm',
  ({ params: { cost, impressions }, next }) => impressions === 0 ? 0 : next({ cost, impressions })
);
```

The destructuring under the `params` parameter looks confusing. Would be nice if we could have the parameters under the main object argument, like this:
```js
const handler = ({ cost, impressions, next }) => impressions === 0 ? 0 : next({ cost, impressions });
```

You can actually do that using something called `decorators`. They decorate the handlers (using functions composition), and act as middlewares sitting between the dispatching and event and executing the handler's logic.

```js
import { decorators } from 'octobus.js';

const { withHandler } = decorators;

// same as above
subscribe('calculator.cpm', withHandler(handler));
```
