/**
 * Add and remove callback events to low interval timers.
 *
 * Executes tick events as fast as requestAnimationFrame allows.
 * Delta time and current time passed to tick events.
 *
 * @usage TickClock.addInterval('update', updateTick, 100)
 *
 * @author Harrison Balogh
 */

/** TODO: Update ticks will not be passed time deltas longer than this value. */
// let TICK_HERTZ_MIN = 1000 / 60

/** Global hertz override for all intervals. Useful when capturing frames for a render. */
let _constantTimeStepOverride = false
let _constantTimeStepHertz = 60 // ms
export const enableConstantTimeStep = _ => _constantTimeStepOverride = true
export const disableConstantTimeStep = _ => _constantTimeStepOverride = false
/** Set global constant time step hertz rate in seconds. */
export const setConstantTimeStepHertz = val => _constantTimeStepHertz = val / 1000;

// Animation render API setup - vendor prefixes
if (typeof window !== "undefined") {
  window.requestAnimFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  (callback => window.setTimeout(callback, 1000 / 60))
}

/**
 * TickInterval object.
 *
 * @param {string} label - Unique label to identify tick interval.
 * @param {function(delta, timestamp)|[function(delta, timstamp)]} callback - Callback(s) to initialize interval with. Can be a singular function or array of functions
 * @param {int} hertz - Target tick speed. Defaults to zero for faster tick rate.
 */
class TickInterval {
  constructor(label, callback = [], hertz = 0) {
    this.label = label;
    this.hertz = hertz;

    /** Callbacks executed at target this.hertz increment */
    this._callbacks = [/* { id: int, callback: Function} */]
    /** Callbacks that have been marked for removal and need to be cleaned up  */
    this._disposedCallbacks = [/* int */];
    /** Last time this tick executed callbacks */
    this._lastExecutionTime = performance.now()
    /** Time interval was paused */
    this._pauseTime = 0

    if (Array.isArray(callback)) {
      callback.forEach((fn => this.addCallback(fn)).bind(this))
    } else {
      this.addCallback(callback)
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
    this._callbacks.push({id, fn: callback})
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
    this._callbacks = this._callbacks.filter(c => !this._disposedCallbacks.includes(c.id))
    this._disposedCallbacks = [];

    // This assumes we want to run constant time steps as fast as possible with constant manual deltas
    if (_constantTimeStepOverride) {
      this._callbacks.forEach(callback => callback(_constantTimeStepHertz, timeNow));
      return;
    }

    // Process time difference
    let delta = timeNow - this._lastExecutionTime;
    if (delta > this.hertz) {
      this._callbacks.forEach(callback => callback.fn(delta / 1000, timeNow));
      // Setting _lastExecutionTime simply to `timeNow` will cause the clock to drift.
      // We need capture the spillover so we set back the time by `delta - this.hertz`.
      if (this.hertz) {
        // If time does not get processed for a period longer than a hertz tick, the next tick
        // will send a very large delta then wait a long time due to the large spillover, so we
        // need to mod the difference by the hertz rate to get our next tick back in step.
        // Skip this if hertz is zero since `% 0` is NaN.
        delta = delta % this.hertz;
      }
      this._lastExecutionTime = timeNow - delta;
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
let _disposedIntervals = [/* int */];

/** Internal: Handle requestAnimFrame callback. */
function update(timeNow) {
  // Cleanup old intervals
  _tickIntervals = _tickIntervals.filter(t => !_disposedIntervals.includes(t.label))
  _disposedIntervals = []

  _tickIntervals.forEach(tickInterval => tickInterval.processTime(timeNow))
  if (_running) _animationFrameId = window.requestAnimationFrame(update)
}

/**
 * Creates a tick interval with the given unique label
 *
 * @param {string} label - Unique label to identify tick interval.
 * @param {function(delta, timestamp)|[function(delta, timestamp)]} callback - Callback(s) to initialize interval with. Can be a singular function or array of functions
 * @param {int} hertz - Target tick speed. Default is zero for highest possible tick rate.
 */
export function addInterval(label, callback = [], hertz = 0) {
  if (_tickIntervals.some(tickInterval => tickInterval.label == label))
    throw `Interval label "${label}" is already in use.`

  _tickIntervals.push(new TickInterval(label, callback, hertz));
}

export function removeInterval(label) {
  _disposedIntervals.push(label)
}

/**
 * Adds callback to tick interval by label and returns GUID for the tick event.
 *
 * @param {function} callback - To add to interval callbacks.
 *
 * @returns {int} ID of the callback.
 */
export function addCallback(label, callback) {
  let tickInterval = _tickIntervals.find(tickInterval => tickInterval.label == label)
  if (tickInterval === undefined) {
    throw `Interval label "${label}" does not exist.`
  }

  return tickInterval.addCallback(callback);
}

/**
 * Removes callback from tick interval by label.
 *
 * Disposed callbacks are not called again and get cleaned on the next tick.
 *
 * @param {int} id ID returned from an `addCallback`
 */
export function removeCallback(label, id) {
  let tickInterval = _tickIntervals.find(tickInterval => tickInterval.label == label)
  if (tickInterval === undefined) {
    throw `Interval label "${label}" does not exist.`
  }

  tickInterval.removeCallback(id)
}

/** Get tick interval running state. */
export const running = () => _running

/** Start tick clock with given interval callbacks. */
export function start() {
  if (_animationFrameId) return
  _running = true

  // Initialize timestamps
  let timeNow = performance.now()
  _tickIntervals.forEach(tickInterval => tickInterval._lastExecutionTime = timeNow)

  _animationFrameId = window.requestAnimationFrame(update)
}

export function resume() {
  if (_animationFrameId) return
  _running = true

  // Track tick intervals in progress
  let timeNow = performance.now()
  _tickIntervals.forEach(tickInterval => tickInterval.resumeTime(timeNow))

  _animationFrameId = window.requestAnimationFrame(update)
}

/** Pause clock ticks. Cancel currently dispatched frame request. */
export function stop() {
  _running = false
  window.cancelAnimationFrame(_animationFrameId)

  // Recover tick intervals in progress
  let timeNow = performance.now()
  _tickIntervals.forEach(tickInterval => tickInterval.pauseTime(timeNow))

  _animationFrameId = undefined
}

/** Stop and remove all tick intervals from clock. */
export async function flush() {
  _tickIntervals = []
  stop()
}

// TODO test methods:

/** Executes a single tick step without starting engine steps. Useful for testing or
 * piping a render intervals to output. */
export function stepTick() {
  if (_running) stop()
  _constantTimeStepOverride = true;
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
