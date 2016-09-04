/* eslint-disable no-console */

import Octobus from '../src';

const { subscribe, dispatch } = new Octobus();

subscribe('hello', ({ params }) => `Hello ${params}!`);

dispatch('hello', 'world').then((result) => {
  console.log(result); // Hello world!
});
