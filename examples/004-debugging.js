import { OctobusLogger } from '../src';

const dispatcher = new OctobusLogger();

dispatcher.subscribe('test', ({ event }) => event.parent.identifier);
dispatcher.subscribe('another.test', ({ dispatch }) => dispatch('test'));
dispatcher.dispatch('another.test');
