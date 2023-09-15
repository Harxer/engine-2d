/**
 * Abstract super class for all entities in the scene.
 * @param Number x The starting position of the entity along the x axis.
 * @param Number y The starting position of the entity along the y axis.
 */
export default class EntityBase {
  // check what 'typeof this' is in a superclass when you call a superclasses method from a subclass
  constructor() {
    this.removed = false
  }

  update(delta) {
    /** Override in children */
  }

  render(context) {
    /** Override in children */
  }
}
