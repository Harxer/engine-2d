/**
 * Provides a user-manipulated 2D space rendered to an HTML Canvas element.
 *
 * Provides a framework for a player, input, and camera backed by an TickClock module.
 * Render result is output to an HTML canvas element. Sets up key and mouse interactions
 * on the canvas element.
 *
 * Goal of World.js:
 * - World keeps references to abstract renderable entities. Calls each entities abstract functions.
 * - Render, zoom, and transform its HTML Canvas context.
 * - Attach user input to HTML Canvas and track input.
 *
 * @author Harrison Balogh
 */

import * as TickClock from './TickClock.js'
import InputReader, { InputInitializer } from './Input.js'

/** Controls console logging throughout package. */
export let globalDebug = false;
/** Override global console logging throughout package. @param {boolean} value  */
export function setGlobalDebug(value) {
  globalDebug = value;
}

let _htmlCanvasElement;
let _renderContext;
let _canvasFlush = true
let _view = {
  width: 800,
  height: 600,
  x: 0,
  y: 0
}
let _entities = []

/** Add entity to list. Returns newly added entity */
export function entityAdd(entity) {
  _entities.push(entity)
  return entity
}

export const viewX = () => _view.x
export const viewY = () => _view.y
export const viewWidth = () => _view.width
export const viewHeight = () => _view.height

/**
 * Center view on provided coordinates.
 * @param {int} x - Center view on x value
 * @param {int} y - Center view on y value
 * @TODO Add acceleration.
 * @usage World.addTickEvent(_ => World.cameraTargetCoordinate(player.pos.x, player.pos.y)) // Follow player
 */
export function cameraTargetCoordinate(x, y) {
  let xMod = (x - _view.width / 2) - _view.x
  let yMod = (y - _view.height / 2) - _view.y
  _renderContext.translate(-xMod, -yMod)
  _view.x = x - _view.width / 2
  _view.y = y - _view.height / 2
}

/**
 * Offset view by provided values
 * @param {int} x - Offset view by x value
 * @param {int} y - Offset view by y value
 * @usage World.addTickEvent(_ => World.cameraOffset(1, 0)) // Constant right panning.
 */
export function cameraOffset(x, y) {
  _renderContext.translate(x, y)
  _view.x -= x
  _view.y -= y
}

/**
 * Add interval to world tick clock.
 * @param {Function} callback
 */
export function addTickClockInterval(label, hertz, callback) {
  TickClock.addInterval(label, hertz, callback);
}

/** Dispose entities flagged for removal */
function entityDispose() {
  for (let i = 0; i < _entities.length; i++) {
    if (_entities[i].removed) {
      _entities.splice(i, 1)
      i--
    }
  }
}

/** Populate entity collisions array */
function entityCheckCollisions() {
  _entities.forEach(entity => entity.collisions = [])

  for (let e = 0; e < _entities.length - 1; e++) {
    let entity = _entities[e]
    if (entity.colliderType === undefined) continue

    for (let p = e + 1; p < _entities.length; p++) {
      let peer = _entities[p]
      if (peer.colliderType === undefined || !(COLLIDER_MASK[entity.colliderType] & peer.colliderType)) continue
        let xDist = Math.pow(peer.position.x - entity.position.x, 2)
        let yDist = Math.pow(peer.position.y - entity.position.y, 2)
        if (xDist + yDist < Math.pow(peer.size + entity.size, 2)) {
          entity.collisions.push(peer)
          peer.collisions.push(entity)
        }
    }
  }
}

/** Update each entity */
function entityUpdates(delta, timestamp) {
  _entities.forEach(entity => entity.update(delta, timestamp))
}

/** Render each entity */
function entityRender(context) {
  _entities.forEach(entity => entity.render(context))
}

/** Internal: Call entity update handlers and dispose old entities */
function updateTick(delta, timestamp) {
  // entityCheckCollisions()
  entityDispose()

  // Handle player input
  // _player.handleInput(delta, InputReader.playerInputVectorUpdate(timestamp))
  // if (InputReader.isMouseDown() && !InputReader.isMouseWithShift()) {
      // _player.spit()
  // }

  entityUpdates(delta, timestamp)
}

/** Internal: Call entity render handlers and flushes previous frame.  */
function renderTick() {
  // Clear previous draw frame
  if (_canvasFlush) _renderContext.clearRect(_view.x, _view.y, _view.width, _view.height)
  // Draw entities
  entityRender(_renderContext)
}

/** Internal: Synchronizes canvas width with HTML element size  */
function syncCanvasSize() {
  // Canvas transforms cleared on setting its height or width. Preserve here
  let transform = _renderContext.getTransform()

  // Keep canvas render size matching style size
  _htmlCanvasElement.width = _htmlCanvasElement.offsetWidth
  _htmlCanvasElement.height = _htmlCanvasElement.offsetHeight

  // Apply preserved context transformations
  _renderContext.setTransform(transform)

  // World viewport is kept at same size as canvas
  _view.width = _htmlCanvasElement.offsetWidth
  _view.height = _htmlCanvasElement.offsetHeight
}

/**
 * Attach a World module to an HTML canvas element selector to render result of
 * of simulation. Attaches mouse listeners to canvas for mouse interactions.
 *
 * @param canvas {Canvas} HTML Canvas element for scene render and mouse listener.
 */
export function init(htmlCanvasElement) {
  // Init canvas context
  _htmlCanvasElement = htmlCanvasElement
  _renderContext = _htmlCanvasElement.getContext('2d')
  syncCanvasSize()
  window.addEventListener('resize', syncCanvasSize)

  // Setup keyboard and mouse actions
  InputInitializer.initMouseListener(_htmlCanvasElement)
  InputInitializer.initKeyListener()
  InputInitializer.initInputPlayerHandler()

  // Setup tick clock
  TickClock.addInterval('update', updateTick, 0)
  TickClock.addInterval('render', renderTick, 60)
  TickClock.start()
}
