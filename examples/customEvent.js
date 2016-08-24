import { createEventDispatcher, Event } from 'octobus.js';

const dispatcher = createEventDispatcher();

dispatcher.subscribe(/createOne$/, ({ event }) => {
  if (event.meta.userId) {
    // ... apply user stamps
  }
}, 1000);

dispatcher.dispatch(new Event('do.something', null, {
  userId: 1,
}));
