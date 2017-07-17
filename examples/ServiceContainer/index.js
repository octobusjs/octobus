import { MessageBus, ServiceBus } from '../../src';
import CalculatorContainer from './Calculator';
import assert from 'assert';

const messageBus = new MessageBus();
const serviceBus = new ServiceBus();

serviceBus.connect(messageBus);
serviceBus.register('calculator', new CalculatorContainer());

Promise.all([
  serviceBus.send('calculator.cpm', { cost: 22, impressions: 0 }),
  serviceBus.send('calculator.cpm', { cost: 22, impressions: 100 }),
])
  .then(results => {
    assert.equal(results[0], 0);
    assert.equal(results[1], 220);
  })
  .catch(err => console.log(err));

// or

const Calculator = serviceBus.extract('calculator');
Calculator.cost({ cpm: 220, impressions: 100 })
  .then(result => {
    assert.equal(result, 22);
  })
  .catch(err => console.log(err));
