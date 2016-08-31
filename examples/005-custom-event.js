import Octobus, { Event } from '../src';

const dispatcher = new Octobus();

dispatcher.subscribe(/createOne$/, ({ event }) => {
  if (event.meta.userId) {
    // ... apply user stamps
  }
}, 1000);

dispatcher.dispatch(new Event('do.something', null, {
  userId: 1,
}));
