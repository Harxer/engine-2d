/**
 * Maintains a physics body state for 2D space. Modified by vector-based
 * impulses.
 *
 * @author Harrison Balogh
 */
import { Point, Vector, boundAngle } from '@harxer/geometry'

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

const ZERO_THRESHOLD = 0.001

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

    this.position = new Point(x, y)
    this.mass = 1

    this.velocity = new Vector(0, 0)
    this.FRICTION_COEFF = 0.05

    /** Direction body is facing */
    this.rotation = 0.0
    /** Rotational velocity */
    this.spin = 0
    this.FRICTION_SPIN_COEFF = 5 * Math.PI
  }

  update(delta) {
    if (this.velocity.magnitude() > ZERO_THRESHOLD) {
      this.position.x += this.velocity.x() * delta
      this.position.y += this.velocity.y() * delta
    }
    if (this.spin > ZERO_THRESHOLD || this.spin < -ZERO_THRESHOLD) {
      this.rotation = boundAngle(this.rotation + this.spin * delta)
    }

    // Apply friction (treated as fluid resistance) - calculated on the last frame's total velocity
    // or at the end to count it towards the next frame.
    let frictionMagnitude = 0.5 * Math.pow(this.velocity.magnitude(), 2) * this.FRICTION_COEFF * delta
    let friction = Vector.fromMagnitudeAngle(frictionMagnitude, this.velocity.flipped().angle())
    this.addImpulse(friction)

    // Apply rotation friction
    let spinFriction = 0.5 * Math.pow(this.spin, 2) * this.FRICTION_SPIN_COEFF * delta
    if (this.spin > 0) spinFriction *= -1
    this.addRotationalImpulse(spinFriction)
  }

  /**
   * Adds an impulse too the body's rotation. "Spins" the body.
   * @param {Integer} impulse (deg/s) positive values are clockwise
   */
  addRotationalImpulse(impulse) {
    this.spin += impulse
  }

  /**
   * @param {Vector} impulse (m/s) Velocity
   */
  addImpulse(impulse) {
    this.velocity = this.velocity.plus(impulse)
  }
}
