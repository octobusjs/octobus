/* eslint-disable no-console */
import { createEventDispatcher, decorators } from '../src';
import assert from 'assert';

const { subscribe, dispatch } = createEventDispatcher();
const { withHandler, withDefaultParams } = decorators;

subscribe('math.sum', withHandler(({ left, right }) => left + right));
subscribe('math.sum', withDefaultParams(
  ({ params, next }) => {
    const { integer, ...nextParams } = params;

    if (integer) {
      nextParams.left = Math.floor(nextParams.left);
      nextParams.right = Math.floor(nextParams.right);
    }

    return next(nextParams);
  },
  { integer: false }
));
subscribe('math.product', withHandler(({ left, right }) => left * right));

const run = async () => {
  assert.equal(await dispatch('math.sum', { left: 2, right: 3 }), 5);

  assert.equal(await dispatch('math.product', { left: 2, right: 3 }), 6);

  assert.equal(await dispatch('math.sum', { left: 1.5, right: 2.5, integer: true }), 3); // 3
};

run().catch((err) => {
  console.log(err);
});
