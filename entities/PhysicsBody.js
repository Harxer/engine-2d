import { Point, Vector } from 'hx-geometry'

export const COLLIDER_FILTER = {
  PLAYER: 1,
  BULLET: 2,
  MOB: 4,
  WALL: 8
}
export const COLLIDER_MASK = {
  [COLLIDER_FILTER.PLAYER]: COLLIDER_FILTER.MOB | COLLIDER_FILTER.WALL,
  [COLLIDER_FILTER.BULLET]: COLLIDER_FILTER.MOB | COLLIDER_FILTER.WALL,
  [COLLIDER_FILTER.MOB]: COLLIDER_FILTER.PLAYER | COLLIDER_FILTER.BULLET | COLLIDER_FILTER.WALL,
  [COLLIDER_FILTER.WALL]: COLLIDER_FILTER.PLAYER | COLLIDER_FILTER.BULLET | COLLIDER_FILTER.MOB
}

/**
 * Abstract super class for all entities in the scene.
 * @param Number x The starting position of the entity along the x axis.
 * @param Number y The starting position of the entity along the y axis.
 */
export default class PhysicsBody {
  // check what 'typeof this' is in a superclass when you call a superclasses method from a subclass
  constructor(x, y, colliderType) {
    this.colliderType = colliderType
    this.collisions = [] // Entities overlapping this entity

    this.rotation = 0.0
    this.position = new Point(x, y)
    this.mass = 1

    this.velocity = new Vector(0, 0)
    this.FRICTION_COEFF = 0.05
  }

  update(delta) {
    if (this.velocity.magnitude() > 0.001) {
      this.position.x += this.velocity.x() * delta
      this.position.y += this.velocity.y() * delta
    }

    // Apply friction (treated as fluid resistance) - calculated on the last frame's total velocity
    // or at the end to count it towards the next frame.
    let frictionMagnitude = 0.5 * Math.pow(this.velocity.magnitude(), 2) * this.FRICTION_COEFF * delta
    let friction = Vector.fromMagnitudeAngle(frictionMagnitude, this.velocity.flipped().angle())
    this.addImpulse(friction)
  }

  /**
   * @param {Vector} impulse (m/s) Velocity
   */
  addImpulse(impulse) {
    this.velocity = this.velocity.plus(impulse)
  }
}
