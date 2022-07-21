/**
 * World.js provides framework for a player, input, and camera attached to an Engine module.
 * It will render itself to an HTML canvas element.
 */
import Player from './entities/player.js'
import * as Engine from './engine.js'
import InputReader, { InputInitializer } from './input.js'

// import UserStateModel from 'hx-rtmesh-lib/models/UserState.js'
import UserInputModel from 'hx-rtmesh-lib/models/UserInput.js'
import SyncGoop from './entities/SyncGoop.js'

// let userState = new UserStateModel()
let userInput = new UserInputModel()

let _canvasBg;
let _canvasFg;
let _contentContext;
let _clippingContext;
let _player = null
let _syncGoopMap = {}
let _canvasFlush = true
let _view = {
  width: 800,
  height: 600,
  x: 0,
  y: 0
}

let _entities = []
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
    if (entity.colliderType === undefined || !MOVE_STATES.includes(entity.state)) continue

    for (let p = e + 1; p < _entities.length; p++) {
      let peer = _entities[p]
      if (peer.colliderType === undefined || !MOVE_STATES.includes(peer.state) || !(COLLIDER_MASK[entity.colliderType] & peer.colliderType)) continue
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
function entityUpdate(delta, timestamp) {
  _entities.forEach(entity => entity.update(delta, timestamp))
}
/** Render each entity */
function entityRender(context) {
  _entities.forEach(entity => entity.render(context))
}
/** Add entity to list. Returns newly added entity */
function entityAdd(entity) {
  // _entities.splice(0, 0, entity)
  _entities.push(entity)
  return entity
}

/** Network method 2: send player input */
export const getPlayerInputSync = timestamp => userInput.sync(InputReader.playerInputVectorSync(timestamp))
/** Network method 1: send player state */
// export const getPlayerStateSync = () => userState.sync({
//   x: _player.position.x,
//   y: _player.position.y,
//   angle: _player.rotation
// })
export const addSyncPlayer = id => {
  if (_syncGoopMap[id]) return
  _syncGoopMap[id] = entityAdd(new SyncGoop(id))
}
export const removeSyncPlayer = id => {
  let syncGoop = _syncGoopMap[id]
  delete _syncGoopMap[id]
  syncGoop.removed = true
}
export const syncPlayerState = data => {
  data.forEach(state => {
    _syncGoopMap[state.id].sync(state)
  })
}

export const viewX = () => _view.x
export const viewY = () => _view.y
export const viewWidth = () => _view.width
export const viewHeight = () => _view.height
const CAMERA_STYLE = {
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

function updateTick(delta, timestamp) {
  // entityCheckCollisions()
  entityDispose()

  // Handle player input
  _player.handleInput(delta, InputReader.playerInputVectorUpdate(timestamp))
  // if (InputReader.isMouseDown() && !InputReader.isMouseWithShift()) {
      // _player.spit()
  // }

  entityUpdate(delta)

  // Apply world camera style
  CAMERA_STYLE.STATIC()
}

function renderTick() {
  if (_canvasFlush) _contentContext.clearRect(_view.x, _view.y, _view.width, _view.height)
  entityRender(_contentContext)
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
  _canvasBg = canvasBg
  _canvasFg = canvasFg
  _contentContext = _canvasBg.getContext('2d')
  _clippingContext = _canvasFg && _canvasFg.getContext('2d')

  InputInitializer.initMouseListener(_canvasFg)
  InputInitializer.initKeyListener()
  InputInitializer.initInputPlayerHandler()
  InputInitializer.addKeyAction(InputReader.KEYCODE.ESC, () => Engine.running() ? Engine.stop() : Engine.start(), true, false)
  InputInitializer.addKeyAction(InputReader.KEYCODE.I, () => _canvasFlush = !_canvasFlush, true, false)

  syncCanvasSize()
  window.addEventListener('resize', syncCanvasSize)

  _player = entityAdd(new Player(100, 100, 10))

  Engine.addTickEvent(updateTick)
  Engine.addRenderEvent(renderTick)
  Engine.start()
}
