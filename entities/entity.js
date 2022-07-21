export const STATE = {
  NONE: 0,
  EXPLODED: 1,
  REFORMING: 3,
  PHASED: 4,
  PERGATORY: 5,
  FLEE: 6,
  RAGE: 7
}

export const MOVE_STATES = [STATE.NONE, STATE.PHASED, STATE.FLEE, STATE.RAGE]

/**
 * Abstract super class for all entities in the scene.
 * @param Number x The starting position of the entity along the x axis.
 * @param Number y The starting position of the entity along the y axis.
 */
export default class Entity {
  // check what 'typeof this' is in a superclass when you call a superclasses method from a subclass
  constructor() {
    this.removed = false
    this.state = STATE.NONE
  }

  update(delta) {
    /** Override in children */
  }

  render(context) {
    /** Override in children */
  }
}
