import Octobus from './Octobus';
import repeat from 'lodash/repeat';
import microtime from 'microtime';
import { getErrorStack } from './utils';

const formatNumber = (nr) => parseFloat(Math.round(nr * 100) / 100).toFixed(2);

const getDuration = ({ start, end }) => formatNumber((end - start) / 1000);

const fileIndicator = String.fromCharCode(9500);

const getSubscriptionFileName = () => {
  const stack = getErrorStack().reverse();
  let index = 0;
  while (index < stack.length) {
    if (/.*(OctobusWithLogger.subscribe).*/.test(stack[index])) {
      return stack[index - 1];
    }
    index++;
  }
  return false;
};

export default class OctobusWithLogger extends Octobus {
  static defaultOptions = {
    log: console.log.bind(console), // eslint-disable-line no-console
    logSubscriptions: true,
    logParams: true,
  };

  constructor(options = {}) {
    super();
    this.options = {
      ...OctobusWithLogger.defaultOptions,
      ...options,
    };

    this.timetable = {};
  }

  subscribe(rawEventIdentifier, handler, priority, meta = {}) {
    return super.subscribe(rawEventIdentifier, handler, priority, {
      ...meta,
      filename: getSubscriptionFileName(),
    });
  }

  runHandler(args) {
    const { event, params, handlerConfig } = args;

    event.selfCalls.push({
      params,
      subscriptionFilename: handlerConfig.meta.filename.trim(),
    });

    return super.runHandler(args);
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
          this.logItem(this.timetable[event.uid]);
        }

        delete this.timetable[event.uid];
      }
    }

    return super.emit(...args);
  }

  logItem(item, level = 1) {
    const { event } = item;
    const { identifier } = event;
    const callsNr = event.selfCalls.length;
    this.options.log(`${repeat('- ', level)}${identifier}(${callsNr}) [${getDuration(item)}ms]`);
    if (this.options.logSubscriptions) {
      event.selfCalls.forEach((selfCall) => {
        const { params, subscriptionFilename } = selfCall;
        let msg = `${repeat('  ', level - 1)}  ${fileIndicator} ${subscriptionFilename}`;

        if (this.options.logParams) {
          msg += `: ${JSON.stringify(params)}`;
        }

        this.options.log(msg);
      });
    }
    item.children.forEach((child) => {
      this.logItem(child, level + 1);
    });
  }
}
