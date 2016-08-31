import Octobus from '../src';

const { subscribe, lookup } = new Octobus();

subscribe('say.hello', ({ params }) => `Hello ${params}!`);
subscribe('say.goodbye', ({ params }) => `Goodbye ${params}!`);

const say = lookup('say');

Promise.all([say.hello('world'), say.goodbye('my friend')]).then((result) => {
  console.log(result); // [ 'Hello world!', 'Goodbye my friend!' ]
});
