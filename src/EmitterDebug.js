import EventEmitter from 'events';
import repeat from 'lodash/repeat';
import microtime from 'microtime';

const formatNumber = (nr) => parseFloat(Math.round(nr * 100) / 100).toFixed(2);

const getDuration = ({ start, end }) => formatNumber((end - start) / 1000);

const fileIndicator = String.fromCharCode('9500');

export default class EmitterDebug extends EventEmitter {
  static defaultOptions = {
    subscriptions: true,
    params: true,
  };

  constructor(
    log = console.log.bind(console), // eslint-disable-line no-console
    options = {}
  ) {
    super();
    this.log = log;
    this.timetable = {};
    this.options = {
      ...EmitterDebug.defaultOptions,
      ...options,
    };
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
          this.logEvent(this.timetable[event.uid]);
        }

        delete this.timetable[event.uid];
      }
    }

    return super.emit(...args);
  }

  logEvent(item, level = 1) {
    const { event } = item;
    const { identifier } = event;
    const callsNr = event.selfCalls.length;
    this.log(`${repeat('- ', level)}${identifier}(${callsNr}) [${getDuration(item)}ms]`);
    if (this.options.subscriptions) {
      event.selfCalls.forEach((selfCall) => {
        const { params, subscriptionFilename } = selfCall;
        let msg = `${repeat('  ', level - 1)}  ${fileIndicator} ${subscriptionFilename}`;

        if (this.options.params) {
          msg += `: ${JSON.stringify(params)}`;
        }

        this.log(msg);
      });
    }
    item.children.forEach((child) => {
      this.logEvent(child, level + 1);
    });
  }
}
