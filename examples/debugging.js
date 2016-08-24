import { createEventDispatcher, EmitterDebug } from 'octobus.js';

const dispatcher = createEventDispatcher({
  emitter: new EmitterDebug(),
});

dispatcher.subscribe('test', ({ event }) => event.parent.identifier);
dispatcher.subscribe('another.test', ({ dispatch }) => dispatch('test'));
dispatcher.dispatch('another.test');
