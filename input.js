/**
 * Input handler for user interaction with world. Mouse interactions need to be attached to
 * an HTML element that emits mousemove events `(InputInitializer.initMouseListener(<html element>))`.
 * Key actions are assigned callbacks using `InputInitializer.setKeyAction(InputReader.KEYCODE.<key>, callback)`.
 *
 * @author Harrison Balogh
 */
 import { Vector } from '@harxer/geometry'

const UPDATE = 0
const SYNC = 1

const InputReader = {
  KEYCODE: {
    LEFT: 65,
    UP: 87,
    RIGHT: 68,
    DOWN: 83,
    LEFT_ALT: 37,
    UP_ALT: 38,
    RIGHT_ALT: 39,
    DOWN_ALT: 40,
    SPACEBAR: 32,
    I: 73,
    O: 79,
    K: 75,
    L: 76,
    P: 80,
    R: 82,
    ESC: 27
  },
  isKeyPressed: (keyCode) => {
    let key = input.key[keyCode]
    if (key === undefined) return undefined
    return key.down
  },
  isMouseDown: () => {
    return input.mouse.down
  },
  isMouseWithShift: () => {
    return input.mouse.withShift
  },
  mouseLocation: () => {
    return {x: input.mouse.x, y: input.mouse.y}
  },
  playerInputVectorUpdate: timestamp => InputPlayerHandler.inputVector(timestamp, UPDATE),
  playerInputVectorSync: timestamp => InputPlayerHandler.inputVector(timestamp, SYNC),
}
export default InputReader

const KeyListenerData = () => ({down: 0, actionsPress: [], actionsRelease: []})
let input = {
  key: { /** keycode: KeyListenerData */},
  mouse: {
    x: 0, y: 0,
    down: false,
    withShift: false,
    downAction: () => {},
    buttons: {}
  }
}
let handleMouseEvent = e => {
  // console.log(`Mouse ${e.type}`)
  input.mouse.withShift = e.shiftKey
  input.mouse.down = (e.type == "mousedown")
  input.mouse.buttons[e.button] = (e.type == "mousedown")
  if (input.mouse.down) input.mouse.downAction(input.mouse.x, input.mouse.y)
}

const handleKeyPress = keyEvent => {
  keyEvent = keyEvent || window.event;
  // console.log(`Key down: ${keyEvent.keyCode}`)
  let handledKey = input.key[keyEvent.keyCode]
  if (handledKey == undefined) return

  if (handledKey.down && keyEvent.type == 'keydown') return // Ignore repeats

  let actionData = {timeStamp: keyEvent.timeStamp, keyCode: keyEvent.keyCode}
  if (keyEvent.type == 'keydown') {
    handledKey.down = keyEvent.timeStamp
    handledKey.actionsPress.forEach(action => action(actionData))
  }
  if (keyEvent.type == 'keyup') {
    handledKey.actionsRelease.forEach(action => action(actionData))
    handledKey.down = 0 // Key up from window event clears key press time
  }
}

export const InputInitializer = {
  /**
   * Adds a callback to the given KeyCode press/release
   * @param {*} keyCode
   * @param {*} action
   * @returns
   */
   addKeyAction: (keyCode, action, forPress = true, forRelease = true) => {
    if (typeof action !== 'function') return
    let key = input.key[keyCode]
    if (key === undefined) {
      input.key[keyCode] = KeyListenerData()
      key = input.key[keyCode]
    }
    if (forPress) key.actionsPress.push(action)
    if (forRelease) key.actionsRelease.push(action)
  },
  /**
   * Initialize mouse listeners relative to given HTML element.
   *
   * @param {HMTL Element} element bounding HTML element to add mouse listeners
   */
  initMouseListener: (element, mouseDownAction) => {
    if (typeof mouseDownAction === 'function') input.mouse.downAction = mouseDownAction
    element.addEventListener('mousemove', e => {
      var rect = element.getBoundingClientRect()
      input.mouse.x = Math.floor(e.clientX - rect.left)
      input.mouse.y = (e.clientY - rect.top)
    })
    element.addEventListener('mouseup', handleMouseEvent)
    element.addEventListener('mousedown', handleMouseEvent)
    element.oncontextmenu = e => e.preventDefault();
  },
  initKeyListener: () => {
    window.addEventListener('keydown', handleKeyPress)
    window.addEventListener('keyup', handleKeyPress)
  },
  initInputPlayerHandler: () => InputPlayerHandler.init(),
  cleanup: element => {
      element.removeEventListener('mouseup', handleMouseEvent)
      element.removeEventListener('mousedown', handleMouseEvent)
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('keyup', handleKeyPress)
  }
}

/** Support for player input handling. LEFT/RIGHT/UP/DOWN input buffering
 * Need to call init (from InputInitializer) to setup properly.
*/
const InputPlayerHandler = {
  bufferInputs: Array(2).fill({x: 0, y: 0}), // Use for: 0 - 'updateTick' and 1 - 'syncTick'

  init: () => {
    InputInitializer.addKeyAction(InputReader.KEYCODE.RIGHT, InputPlayerHandler.captureReleaseTime, false)
    InputInitializer.addKeyAction(InputReader.KEYCODE.LEFT, InputPlayerHandler.captureReleaseTime, false)
    InputInitializer.addKeyAction(InputReader.KEYCODE.UP, InputPlayerHandler.captureReleaseTime, false)
    InputInitializer.addKeyAction(InputReader.KEYCODE.DOWN, InputPlayerHandler.captureReleaseTime, false)
  },

  /** Gets input buffered for buffer index and resets buffer.
   * @returns Vector - representing aggregated key hold times (UP/DOWN/LEFT/RIGHT) since last buffer extract
   */
  inputVector: (timestamp, bufferIndex) => {
    InputPlayerHandler.captureReleaseTimeAll(timestamp)

    let inputVector = new Vector(
      InputPlayerHandler.bufferInputs[bufferIndex].x / 1000,
      InputPlayerHandler.bufferInputs[bufferIndex].y / 1000
    )
    // Clear Buffer
    InputPlayerHandler.bufferInputs[bufferIndex] = {x: 0, y: 0}

    return inputVector
  },

  /** Helper for calling captureReleaseTime on each input key (UP/DOWN/LEFT/RIGHT) */
  captureReleaseTimeAll: timeStamp => {
    InputPlayerHandler.captureReleaseTime({keyCode: InputReader.KEYCODE.LEFT, timeStamp})
    InputPlayerHandler.captureReleaseTime({keyCode: InputReader.KEYCODE.RIGHT, timeStamp})
    InputPlayerHandler.captureReleaseTime({keyCode: InputReader.KEYCODE.UP, timeStamp})
    InputPlayerHandler.captureReleaseTime({keyCode: InputReader.KEYCODE.DOWN, timeStamp})
  },

  /**
   * Handle key release event by storing key-release time in buffers for update and sync ticks.
   * Key down logic in handleKeyPress()
   * @param {*} keyEvent - Passed from handleKeyPress - window event keydown
   */
  captureReleaseTime: keyUpEvent => {
    let key = input.key[keyUpEvent.keyCode]
    if (key.down == 0) return // Key not pressed

    let dT = keyUpEvent.timeStamp - key.down // See handleKeyPress for keyDown time
    if (dT <= 0) return // I guess?

    if (keyUpEvent.keyCode === InputReader.KEYCODE.RIGHT) { // positive x time indicates moving right
      InputPlayerHandler.bufferInputs.forEach(buffer => buffer.x += dT)
    } else
    if (keyUpEvent.keyCode === InputReader.KEYCODE.LEFT) { // negative x time indicates moving left
      InputPlayerHandler.bufferInputs.forEach(buffer => buffer.x -= dT)
    } else
    if (keyUpEvent.keyCode === InputReader.KEYCODE.UP) { // positive y time indicates moving up
      InputPlayerHandler.bufferInputs.forEach(buffer => buffer.y -= dT)
    } else
    if (keyUpEvent.keyCode === InputReader.KEYCODE.DOWN) { // negative y time indicates moving down
      InputPlayerHandler.bufferInputs.forEach(buffer => buffer.y += dT)
    }
    // If pressed, move key.down timestamp to this key up event
    key.down = keyUpEvent.timeStamp
  }
}
