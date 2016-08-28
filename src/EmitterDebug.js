import EventEmitter from 'events';
import repeat from 'lodash/repeat';
import microtime from 'microtime';

const formatNumber = (nr) => parseFloat(Math.round(nr * 100) / 100).toFixed(2);

const getDuration = ({ start, end }) => formatNumber((end - start) / 1000);

const logEvent = (log, item, level = 1) => {
  const { event } = item;
  log(`${repeat('- ', level)}${event.identifier}(${event.selfCalls}) [${getDuration(item)}ms]`);
  item.children.forEach((child) => {
    logEvent(log, child, level + 1);
  });
};

export default class extends EventEmitter {
  constructor(log = console.log.bind(console)) { // eslint-disable-line no-console
    super();
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
          start: microtime.now(),
          children: [],
        };
      } else {
        this.timetable[event.uid].end = microtime.now();

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
