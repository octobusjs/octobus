import { createEventDispatcher } from '../src';

const { subscribe, dispatch } = createEventDispatcher();

subscribe('foo', () => 'bar');

dispatch('foo').then((result) => {
  console.log(result); // bar
});
