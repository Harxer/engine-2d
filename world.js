/**
 * World.js provides framework for a player, input, and camera attached to an Engine module.
 * It will render itself to an HTML canvas element.
 */

import * as Entity from './entities/entity.js'
import * as Engine from './engine.js'
import * as Ui from './ui.js'
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

function handlePlayerInput() {
  if (_player.state == Entity.STATE.NONE || _player.state == Entity.STATE.PHASED) {
    let moveMod = {
      x: InputReader.isKeyPressed(InputReader.KEYCODE.RIGHT) - InputReader.isKeyPressed(InputReader.KEYCODE.LEFT),
      y: InputReader.isKeyPressed(InputReader.KEYCODE.DOWN) - InputReader.isKeyPressed(InputReader.KEYCODE.UP)
    }
    if (moveMod.x != 0 || moveMod.y != 0) {
      _player.waypoints.clear()
      _player.acceleration.angle(Math.atan2(moveMod.y, moveMod.x))
      _player.acceleration.magnitude(_player.accelerationMax)
    } else if (_player.waypoints.isEmpty()) {
      _player.acceleration.magnitude(0)
    }
  }
  // Mouse control
  // if (InputReader.isMouseDown() && input.mouse.withShift) {
  //   _player.waypoints.add({ x: InputReader.mouseLocation().x, y: InputReader.mouseLocation().y })
  //   input.mouseDown = false
  // }
  // if (input.mouse.buttons['2'] !== undefined) {
  //   if (input.mouse.buttons['2'] === true) {
  //     _player.waypoints.clear()
  //   }
  // }
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
    contentContext.translate(-xMod, -yMod)
    _view.x = _player.position.x - _view.width / 2
    _view.y = _player.position.y - _view.height / 2
    // todo - accel
  },
  PAN: (xMod, yMod) => {
    contentContext.translate(xMod, yMod)
    _view.x -= xMod
    _view.y -= yMod
  }
}
export function updateTick(delta) {
  handlePlayerInput()
  gameMode.applyCamera()
  Entity.update(delta)
}
export function renderTick(context) {
  if (_canvasFlush) contentContext.clearRect(_view.x, _view.y, _view.width, _view.height)
  Entity.render(context)
}
function renderBounds() {
  // gray outer bounds
  clippingContext.fillStyle = "rgb(234, 236, 238)"
  clippingContext.fillRect(0, 0, Ui.canvasFg().width, Ui.canvasFg().height)
  // Erase pixels for viewport
  clippingContext.clearRect(0, 0, _view.width, _view.height)
  // border lines
  // clippingContext.strokeStyle = "black"
  // clippingContext.lineWidth = 1
  // clippingContext.strokeRect(0, 0, _view.width, _view.height)
}
function syncCanvasSize() {
  // Each time the height or width of a canvas is set,
  // the canvas transforms will be cleared.
  let transform = contentContext.getTransform()

  // Keep canvas render size matching style size
  _canvasBg.width = _canvasBg.offsetWidth
  _canvasBg.height = _canvasBg.offsetHeight
  _canvasFg.width = _canvasFg.offsetWidth
  _canvasFg.height = _canvasFg.offsetHeight

  // Apply preserved context transformations
  contentContext.setTransform(transform)

  // World viewport is kept at same size as canvas
  _view.width = Ui.canvasBg().offsetWidth
  _view.height = Ui.canvasBg().offsetHeight

  renderBounds()
}
export function init(canvasBg, canvasFg = undefined) {
  _player = new Player(0, 0, 5)
  _canvasBg = canvasBg
  _canvasFg = canvasFg
  _contentContext = _canvasBg.getContext('2d')
  _clippingContext = _canvasFg && _canvasFg.getContext('2d')

  InputInitializer.initMouseListener(_canvasFg)
  InputInitializer.setKeyAction(InputReader.KEYCODE.ESC, () => Engine.updating() ? Engine.stop() : Engine.start())
  InputInitializer.setKeyAction(InputReader.KEYCODE.I, () => _canvasFlush = !_canvasFlush)

  syncCanvasSize()
  window.addEventListener('resize', syncCanvasSize)

  Engine.addTickEvent(updateTick)
  Engine.addRenderEvent(renderTick)
  Engine.start()
}
