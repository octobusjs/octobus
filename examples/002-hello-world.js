import { createEventDispatcher } from '../src';

const { subscribe, dispatch } = createEventDispatcher();

subscribe('hello', ({ params }) => `Hello ${params}!`);

dispatch('hello', 'world').then((result) => {
  console.log(result); // Hello world!
});
