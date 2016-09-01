import { OctobusWithLogger } from '../src';

const dispatcher = new OctobusWithLogger();

dispatcher.subscribe('test', ({ event }) => event.parent.identifier);
dispatcher.subscribe('another.test', ({ dispatch }) => dispatch('test'));
dispatcher.dispatch('another.test');
