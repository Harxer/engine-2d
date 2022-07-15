/**
 * World.js provides framework for a player, input, and camera attached to an Engine module.
 * It will render itself to an HTML canvas element.
 */

import * as Entity from './entities/entity'
import Player from './entities/player'
import * as Engine from './engine.js'
import InputReader, { InputInitializer } from './input.js'

let _canvasBg;
let _canvasFg;
let _contentContext;
let _clippingContext;
let _player = null
let _canvasFlush = true
let _view = {
  width: 800,
  height: 600,
  x: 0,
  y: 0
}

export const viewX = () => _view.x
export const viewY = () => _view.y
export const viewWidth = () => _view.width
export const viewHeight = () => _view.height
export const CAMERA_STYLE = {
  STATIC: () => {},
  FOLLOW: () => {
    let xMod = (_player.position.x - _view.width / 2) - _view.x
    let yMod = (_player.position.y - _view.height / 2) - _view.y
    _contentContext.translate(-xMod, -yMod)
    _view.x = _player.position.x - _view.width / 2
    _view.y = _player.position.y - _view.height / 2
    // todo - accel
  },
  PAN: (xMod, yMod) => {
    _contentContext.translate(xMod, yMod)
    _view.x -= xMod
    _view.y -= yMod
  }
}
export function updateTick(delta) {
  CAMERA_STYLE.STATIC()
  Entity.update(delta)
}
export function renderTick() {
  if (_canvasFlush) _contentContext.clearRect(_view.x, _view.y, _view.width, _view.height)
  Entity.render(_contentContext)
}
function renderBounds() {
  // gray outer bounds
  _clippingContext.fillStyle = "rgb(234, 236, 238)"
  _clippingContext.fillRect(0, 0, _canvasFg.width, _canvasFg.height)
  // Erase pixels for viewport
  _clippingContext.clearRect(0, 0, _view.width, _view.height)
  // border lines
  // _clippingContext.strokeStyle = "black"
  // _clippingContext.lineWidth = 1
  // _clippingContext.strokeRect(0, 0, _view.width, _view.height)
}
function syncCanvasSize() {
  // Each time the height or width of a canvas is set,
  // the canvas transforms will be cleared.
  let transform = _contentContext.getTransform()

  // Keep canvas render size matching style size
  _canvasBg.width = _canvasBg.offsetWidth
  _canvasBg.height = _canvasBg.offsetHeight
  _canvasFg.width = _canvasFg.offsetWidth
  _canvasFg.height = _canvasFg.offsetHeight

  // Apply preserved context transformations
  _contentContext.setTransform(transform)

  // World viewport is kept at same size as canvas
  _view.width = _canvasBg.offsetWidth
  _view.height = _canvasBg.offsetHeight

  renderBounds()
}
export function init(canvasBg, canvasFg = undefined) {
  _player = new Player(0, 0, 5)
  _canvasBg = canvasBg
  _canvasFg = canvasFg
  _contentContext = _canvasBg.getContext('2d')
  _clippingContext = _canvasFg && _canvasFg.getContext('2d')

  InputInitializer.initMouseListener(_canvasFg)
  InputInitializer.initKeyListener()
  InputInitializer.setKeyAction(InputReader.KEYCODE.ESC, () => Engine.running() ? Engine.stop() : Engine.start())
  InputInitializer.setKeyAction(InputReader.KEYCODE.I, () => _canvasFlush = !_canvasFlush)

  syncCanvasSize()
  window.addEventListener('resize', syncCanvasSize)

  Engine.addTickEvent(updateTick)
  Engine.addRenderEvent(renderTick)
  Engine.start()
}
