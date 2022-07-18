/**
 * Core engine file. Add ticks events to an Engine module and call Start().
 *
 * @author Harrison Balogh
 */

let RENDER_HERTZ = 1000 / 60

// Animation render API setup - vendor prefixes
window.requestAnimFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  (callback => window.setTimeout(callback, RENDER_HERTZ))

let _running = false
let _lastUpdateTime = 0
let _lastRenderTime = 0
let _tickEvents = [] // {id: int, callback: Function}
let _renderEvents = []
let _renderTimeRemaining = 0
let _disposeEvents = [] // id: int
let _animationFrameId;

function update(updateTime) {
  // Cleanup disposed tick events
  _disposeEvents.forEach(id => {
    let evtIndex = _tickEvents.findIndex(evt => evt.id === id)
    if (evtIndex != -1) {
      _tickEvents.splice(evtIndex, 1)
    }
  })
  _disposeEvents = []

  // Tick events - pass with delta time and timestamp of event
  _tickEvents.forEach(evt => evt.callback(Math.abs(updateTime - _lastUpdateTime) / 1000, updateTime))

  // Render events
  _renderTimeRemaining -= (updateTime - _lastUpdateTime)
  if (_renderTimeRemaining <= 0) {
    _renderTimeRemaining += RENDER_HERTZ
    _renderEvents.forEach(renderEvent => renderEvent((updateTime - _lastRenderTime) / 1000))
    _lastRenderTime = updateTime
  }
  _renderTimeRemaining -= (updateTime - _lastUpdateTime)

  _lastUpdateTime = updateTime
  if (_running) _animationFrameId = window.requestAnimationFrame(update)
}

/**
 * Internal helper for generating engine event IDs.
 * @returns {int} An unused engine event ID.
 */
function generateEventId() {
  let id = (_tickEvents.length + 1) * Math.floor(Math.random() * 1000)
  while (_tickEvents.includes(evt => evt.id === id)) {
    id++
  }
  return id
}

/**
 * Adds callback to tick event and returns GUID for the tick event.
 * @param {*} callback
 * @returns {int} ID of the callback.
 */
export function addTickEvent(callback) {
  let id = generateEventId()
  _tickEvents.push({id: id, callback})
  return id
}

/**
 * Helper for adding multiple callbacks. To get back the ID of the callback, use addTickevent().
 * @param {*} callback
 * @param  {...any} additionalCallbacks
 */
 export function addTickEvents(callback, ...callbacks) {
  addTickEvent(callback)
  if (callbacks.length != 0) addTickEvent(callbacks[0], ...callbacks.slice(1))
}

/**
 * Disposed events are cleaned up before the next update cycle.
 * @param {*} id ID returned from an `addTickEvent`
 */
export function removeTickEvent(id) {
  _disposeEvents.push(id)
}

export function addRenderEvent(callback) {
  if (_renderEvents.includes(callback)) return
  _renderEvents.push(callback)
}

/** Get engine running state. */
export const running = () => _running

/** Start engine ticks with added tick and render events. */
export function start() {
  if (_animationFrameId) return
  stop()
  _running = true
  _lastUpdateTime = performance.now()
  _animationFrameId = window.requestAnimationFrame(update)
}

/** Executes a single tick step without starting engine steps. Useful for testing. */
export function stepTick() {
  if (_running) stop()
  _lastUpdateTime = performance.now()
  _renderTimeRemaining = 0
  window.requestAnimationFrame(update)
}

/** Pause engine ticks. Cancel currently dispatched frame request. */
export function stop() {
  _running = false
  window.cancelAnimationFrame(_animationFrameId)
  _animationFrameId = undefined
}

/** Stop and unregister all tick and render events from engine. */
export async function flush() {
  stop()
  _renderTimeRemaining = RENDER_HERTZ
  _disposeEvents = []
  _tickEvents = []
  _renderEvents = []
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
