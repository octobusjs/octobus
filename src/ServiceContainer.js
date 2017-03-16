class ServiceContainer {
  setServiceBus(serviceBus) {
    this.serviceBus = serviceBus;
  }

  send(...args) {
    return this.serviceBus.send(...args);
  }

  publish(...args) {
    return this.serviceBus.publish(...args);
  }

  extract(...args) {
    return this.serviceBus.extract(...args);
  }
}

export default ServiceContainer;
