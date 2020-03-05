{
  class Event {
    type: string;
    timeStamp: Date;

    constructor(type) {
      this.type = type;
      this.timeStamp = new Date();
    }
  }

  class Emitter {
    events;

    constructor() {
      this.events = {};
    }

    on(type: string, handler: () => void) {
      if (this.events.hasOwnProperty(type)) {
        this.events[type].push(handler);
      } else {
        this.events[type] = [handler];
      }
      return this;
    };

    off(type: string, handler: () => void) {
      if (arguments.length === 0) {
        return this._offAll();
      }
      if (handler === undefined) {
        return this._offByType(type);
      }
      return this._offByHandler(type, handler);
    };

    trigger(event: Event, args: Event[]) {
      if (!(event instanceof Event)) {
        event = new Event(event);
      }
      return this._dispatch(event, args);
    };

    _dispatch(event: Event, args: Event[]) {
      if (!this.events.hasOwnProperty(event.type)) return;
      args = args || [];
      args.unshift(event);

      var handlers = this.events[event.type] || [];
      handlers.forEach(handler => handler.apply(null, args));
      return this;
    };

    _offByHandler(type: string, handler: () => void) {
      if (!this.events.hasOwnProperty(type)) return;
      var i = this.events[type].indexOf(handler);
      if (i > -1) {
        this.events[type].splice(i, 1);
      }
      return this;
    };

    _offByType(type: string) {
      if (this.events.hasOwnProperty(type)) {
        delete this.events[type];
      }
      return this;
    };

    _offAll() {
      this.events = {};
      return this;
    };

    static Event = Event;

    static mixin(obj: Emitter, arr) {
      var emitter: Emitter = new Emitter();

      arr.map(function (name) {
        obj[name] = function () {
          return emitter[name].apply(emitter, arguments);
        };
      });
    };
  }
}
