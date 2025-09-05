class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, data) {
    console.log(`Event emitted: ${event}`, data);
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(data));
    }
  }
}

const eventEmitter = new EventEmitter();
export default eventEmitter;
