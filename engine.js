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

let _updating = false
let _lastUpdateTime = 0
let _tickEvents = []
let _renderEvents = []
let _renderTimeRemaining = 0

function update(updateTime) {

  // Tick events - pass with delta time
  _tickEvents.forEach(tickEvent => tickEvent(updateTime - _lastUpdateTime))

  // Render events
  if (_renderTimeRemaining <= 0) {
    _renderTimeRemaining = RENDER_HERTZ
    _renderEvents.forEach(renderEvent => renderEvent())
  }
  _renderTimeRemaining -= (updateTime - _lastUpdateTime)

  if (_updating) window.requestAnimFrame(update)
  _lastUpdateTime = updateTime
}

export function addTickEvent(callback, ...additionalCallbacks) {
  if (!_tickEvents.includes(callback)) {
    _tickEvents.push(callback)
  }
  if (additionalCallbacks.length != 0) {
    addTickEvent(additionalCallbacks[0], ...additionalCallbacks.slice(1))
  }
}

export function addRenderEvent(callback) {
  if (_renderEvents.includes(callback)) return
  _renderEvents.push(callback)
}

export function lastUpdateTime() {
  return _lastUpdateTime
}

export function updating() {
  return _updating
}

export function start() {
  if (_updating) return
  _updating = true
  window.requestAnimFrame(update)
}

export function stop() {
  _updating = false
}
