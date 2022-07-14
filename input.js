/**
 * Input handler for user interaction with world. Mouse interactions need to be attached to
 * an HTML element that emits mousemove events `(InputInitializer.initMouseListener(<html element>))`.
 * Key actions are assigned callbacks using `InputInitializer.setKeyAction(InputReader.KEYCODE.<key>, callback)`.
 *
 * @author Harrison Balogh
 */

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
    I: 110,
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
  }
}
export default InputReader

let input = {
  key: {
    [InputReader.KEYCODE.LEFT]: {down: false, action: () => {}},
    [InputReader.KEYCODE.UP]: {down: false, action: () => {}},
    [InputReader.KEYCODE.RIGHT]: {down: false, action: () => {}},
    [InputReader.KEYCODE.DOWN]: {down: false, action: () => {}},
    [InputReader.KEYCODE.LEFT_ALT]: {down: false, action: () => {}},
    [InputReader.KEYCODE.UP_ALT]: {down: false, action: () => {}},
    [InputReader.KEYCODE.RIGHT_ALT]: {down: false, action: () => {}},
    [InputReader.KEYCODE.DOWN_ALT]: {down: false, action: () => {}},
    [InputReader.KEYCODE.SPACEBAR]: {down: false, action: () => {}},
    [InputReader.KEYCODE.I]: {down: false, action: () => {}},
    [InputReader.KEYCODE.P]: {down: false, action: () => {}},
    [InputReader.KEYCODE.R]: {down: false, action: () => {}},
    [InputReader.KEYCODE.ESC]: {down: false, action: () => {}}
  },
  mouse: {
    x: 0, y: 0,
    down: false,
    withShift: false,
    downAction: () => {},
    buttons: {}
  }
}

export const InputInitializer = {
  /**
   * Create a listener for the given KeyCode to call an action
   * @param {*} keyCode
   * @param {*} action
   * @returns
   */
  setKeyAction: (keyCode, action) => {
    if (typeof action !== 'function') return
    let key = input.key[keyCode]
    if (key === undefined) return
    key.action = action
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
    let handleMouseEvent = e => {
      // console.log(`Mouse ${e.type}`)
      input.mouse.withShift = e.shiftKey
      input.mouse.down = (e.type == "mousedown")
      input.mouse.buttons[e.button] = (e.type == "mousedown")
      if (input.mouse.down) input.mouse.downAction()
    }
    element.addEventListener('mouseup', handleMouseEvent)
    element.addEventListener('mousedown', handleMouseEvent)
    element.oncontextmenu = e => e.preventDefault();
  }
}

const handleKeyPress = keyEvent => {
  keyEvent = keyEvent || window.event;
  // log(`Log key: ${keyEvent.keyCode}`)
  let handledKey = input.key[keyEvent.keyCode]
  if (handledKey == undefined) return

  handledKey.down = keyEvent.type == 'keydown';
  if (handledKey.down) handledKey.action()
}
document.addEventListener('keydown', handleKeyPress)
document.addEventListener('keyup', handleKeyPress)
