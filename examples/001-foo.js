import Octobus from '../src';

const { subscribe, dispatch } = new Octobus();

subscribe('foo', () => 'bar');

dispatch('foo').then((result) => {
  console.log(result); // bar
});
