/**
 * Add and remove callback events to low interval timers.
 *
 * Executes update tick events as fast as requestAnimationFrame allows.
 * Delta time passed to tick events.
 *
 * @usage TickClock.addTickEvent(() => {}); TickClock.start();
 *
 * @author Harrison Balogh
 */

/** TODO: Update ticks will not be passed time deltas longer than this value. */
let TICK_HERTZ_MIN = 1000 / 60

// Animation render API setup - vendor prefixes
window.requestAnimFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  (callback => window.setTimeout(callback, 1000 / 60))

/**
 * TickInterval object.
 *
 * @param {string} label - Unique label to identify tick interval.
 * @param {int} hertz - Target tick speed.
 * @param {function} callback - Initialize tick interval with callback
 */
class TickInterval {
  constructor(label, hertz, callback = undefined) {
    this.label = label;
    this.hertz = hertz;

    /** Callbacks executed at target this.hertz increment */
    this._callbacks = [/* { id: int, callback: Function} */];
    /** Callbacks that have been marked for removal and need to be cleaned up  */
    this._disposedCallbacks = [/* int */];
    /** Last time this tick executed callbacks */
    this._lastExecutionTime = 0
    /** Time remaining to next tick interval */
    this._remainingTime = 0
    /** Time interval was paused */
    this._pauseTime = 0

    // Optional initialization
    if (callback !== undefined) {
      this._callbacks.push(callback)
    }
  }

  /**
   * Adds callback to tick event and returns GUID for the tick event.
   *
   * @param {function} callback - Executes every target hertz interval.
   *
   * @returns {int} ID of the callback.
   */
  addCallback(callback) {
    // Find unused callback ID.
    let id = (this._callbacks.length + 1) * Math.floor(Math.random() * 1000)
    while (this._callbacks.includes(evt => evt.id === id)) {
      id++
    }
    this._callbacks.push({id, callback})
    return id
  }

  /**
   * Helper for adding multiple callbacks. To get back the ID of the callback, use addCallback().
   *
   * @param {function} callback - Executes every target hertz interval.
   * @param  {...function} additionalCallbacks
   */
  addCallbacks(callback, ...callbacks) {
    this.addCallback(callback)
    if (callbacks.length != 0) this.addCallbacks(callbacks[0], ...callbacks.slice(1))
  }

  /**
   * Removes callback from tick interval.
   *
   * Disposed callbacks are not called again and get cleaned on the next tick.
   *
   * @param {int} id ID returned from an `addCallback`
   */
  removeCallback(id) {
    this._disposedCallbacks.push(id)
  }

  /**
   * Handle time passed and execute callbacks if necessary
   * @param {int} timeNow - Timestamp from a requestAnimationFrame callback
   */
  processTime(timeNow) {
    // Cleanup disposed callbacks
    this._disposedCallbacks.forEach(id => {
      let callbackIndex = this._callbacks.findIndex(evt => evt.id === id)
      if (callbackIndex != -1) {
        this._callbacks.splice(callbackIndex, 1)
      }
    })
    this._disposedCallbacks = []

    // Process time difference
    this._remainingTime -= Math.min((timeNow - this._lastExecutionTime), this.hertz);
    if (this._remainingTime <= 0) {
      this._remainingTime += this.hertz;
      // Execute tick callbacks
      // TODO check necessity of: let dT = Math.min(Math.abs(updateTime - _lastUpdateTime), TICK_HERTZ_MIN)
      this._callbacks.forEach(callback => callback((timeNow - this._lastExecutionTime) / 1000, timeNow))
      this._lastExecutionTime = timeNow;
    }
  }

  /** If this tick interval has not be paused already, notes the pause time. */
  pauseTime(timeNow) {
    if (this._pauseTime != null) return

    this._pauseTime = timeNow
  }

  /** If this tick interval was paused, moves up the last execution time since halt time from `pauseTime()`. */
  resumeTime(timeNow) {
    if (this._pauseTime == null) return

    this._lastExecutionTime += timeNow - this._pauseTime
    this._pauseTime = null
  }

}

let _running = false
let _animationFrameId;
let _tickIntervals = [];

/** Internal: Handle requestAnimFrame callback. */
function update(timeNow) {
  _tickIntervals.forEach(tickInterval => tickInterval.processTime(timeNow))
  if (_running) _animationFrameId = window.requestAnimationFrame(update)
}

/**
 * Creates a tick interval with the given unique label
 *
 * @param {string} label - Unique label to identify tick interval.
 * @param {int} hertz - Target tick speed. Pass a zero for highest possible tick rate.
 * @param {function} callback - Optional callback to initialize interval with
 */
export function addInterval(label, hertz, callback = undefined) {
  // Verify unique label
  if (_tickIntervals.some(tickInterval => tickInterval.label == label)) return

  _tickIntervals.push(new TickInterval(label, hertz, callback));
}

/** Get tick interval running state. */
export const running = () => _running

/** Start tick clock with given interval callbacks. */
export function start() {
  if (_animationFrameId) return
  _running = true

  // Track tick intervals in progress
  let timeNow = performance.now()
  _tickIntervals.forEach(tickInterval => tickInterval.pauseTime(timeNow))

  _animationFrameId = window.requestAnimationFrame(update)
}

/** Pause clock ticks. Cancel currently dispatched frame request. */
export function stop() {
  _running = false
  window.cancelAnimationFrame(_animationFrameId)

  // Recover tick intervals in progress
  let timeNow = performance.now()
  _tickIntervals.forEach(tickInterval => tickInterval.resumeTime(timeNow))

  _animationFrameId = undefined
}

/** Stop and remove all tick intervals from clock. */
export async function flush() {
  _tickIntervals = []
  stop()
}

// TODO test methods:

/** Executes a single tick step without starting engine steps. Useful for testing. */
export function stepTick() {
  if (_running) stop()
  _renderTimeRemaining = 0
  window.requestAnimationFrame(update)
}

/**
 * Returns a promise which is resolved after the given number
 * of engine ticks pass.
 *
 * Example usage:
 *  `Engine.waitTicks(100).then(() => console.log("Finished 100."))`
 * @param {integer} ticks
 */
 export function waitTicks(ticks) {
  return new Promise((resolve) => {
    let evtId;
    let tickCount = ticks
    let countTick = () => {
      tickCount--
      if (tickCount <= 0) {
        removeTickEvent(evtId)
        return resolve()
      }
    }
    evtId = addTickEvent(countTick)
  })
}
