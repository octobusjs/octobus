import EventEmitter from 'events';
import repeat from 'lodash/repeat';

const getDuration = ({ start, end }) => end - start;

const logEvent = (log, item, level = 1) => {
  log(`${repeat('- ', level)}${item.event.identifier} [${getDuration(item)}ms]`);
  item.children.forEach((child) => {
    logEvent(log, child, level + 1);
  });
};

export default class extends EventEmitter {
  constructor(log = console.log.bind(console)) { // eslint-disable-line no-console
    this.log = log;
    this.timetable = {};
  }

  emit(...args) {
    const serviceName = args[0];
    const { params, event } = args[1];

    if (/^(before|after):/.test(serviceName)) {
      if (!this.timetable[event.uid]) {
        this.timetable[event.uid] = {
          event,
          params,
          start: new Date().getTime(),
          children: [],
        };
      } else {
        this.timetable[event.uid].end = new Date().getTime();

        if (event.parent) {
          this.timetable[event.parent.uid].children.push(this.timetable[event.uid]);
        } else {
          logEvent(this.log, this.timetable[event.uid]);
        }

        delete this.timetable[event.uid];
      }
    }

    return super.emit(...args);
  }
}
