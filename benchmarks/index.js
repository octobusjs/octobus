import { createEventDispatcher, decorators } from '../src';
import EmitterDebug from '../src/EmitterDebug';
import Event from '../src/Event';
import Benchmark from 'benchmark';

const dispatcher = createEventDispatcher();
const suite = new Benchmark.Suite;

dispatcher.subscribe('test1000', ({ params }) => params);
for (let i = 0; i < 1000; i++) {
  dispatcher.subscribe(`test${i}`, ({ dispatch, params }) => dispatch(`test${i + 1}`, params));
}

suite.add('RegExp#test', () => {
  return dispatcher.dispatch('test0', 'it works');
})
// add listeners
.on('cycle', (event) => {
  console.log(String(event.target));
})
.on('complete', () => {
  console.log('Fastest is ' + this.filter('fastest').map('name'));
})
// run async
.run({ async: true });
