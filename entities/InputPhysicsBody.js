import { Vector, isZero } from '@harxer/geometry'
import PhysicsBody from './PhysicsBody.js'
import * as PhysicsBodyConstants from './PhysicsBody.js'

/**
 * A subclass of a PhysicsBody that takes force impulses from input vectors.
 */
export default class InputPhysicsBody extends PhysicsBody {
  constructor(x, y) {
    super(x, y, PhysicsBodyConstants.COLLIDER_FILTER.PLAYER)

    this.INPUT_ACCELERATION_MAX = 9000
    this.TURN_RATE = 0 // 10 * Math.PI // zero turnRate indicates instant turns
  }

  // handleCollisions() {
  //   this.collisions.forEach(collider => {
  //     if (collider instanceof Goop && this.state == EntityConstants.STATE.NONE) {
  //       let goop = collider
  //       if (this.size >= goop.size && goop.state !== EntityConstants.STATE.RAGE) {
  //         this.size += (this.size == goop.size)
  //         this.tail.sync()
  //       } else {
  //         this.explode(goop.velocity)
  //         return
  //       }
  //     }
  //   })
  // }

  // handleSpit() {
  //   if (this.state != EntityConstants.STATE.NONE) return
  //   // Spit spits
  //   if (this.spitCooldownRemaining <= 0) {
  //     this.spitCooldownRemaining = this.SPIT_RATE
  //     let y = Input.mouseLocation().y - (this.position.y - viewY())
  //     let x = Input.mouseLocation().x - (this.position.x - viewX())
  //     let dir = Math.atan2(y, x)
  //     const INIT_SPIT_SPEED = 30
  //     Particulate.generate(6, 10, this.position, Vector.fromMagnitudeAngle(6, dir), 4, 1, 1, 1, COLOR.ACCENT)
  //     new Spit(this.position.x, this.position.y, Vector.fromMagnitudeAngle(INIT_SPIT_SPEED, dir), 4, COLOR.TONIC)
  //   }
  //   this.spitCooldownRemaining = Math.max(this.spitCooldownRemaining - delta, 0)
  // }

  handleInput(delta, inputVector) {
    if (isZero(inputVector.magnitude())) return

    // Cheater prevention - Can't have pressed input for longer than when our last input vector was extracted
    // This check doesn't matter for the client but this code is re-used by the server.
    let inputMagnitude = Math.min(inputVector.magnitude(), delta) * this.INPUT_ACCELERATION_MAX * this.mass

    // Turn if has non-instant turning
    if (!isZero(this.TURN_RATE)) {
      let angDiff = anglesMatch(this.rotation, inputVector.angle(), this.TURN_RATE * delta)
      if (angDiff != 0) {
        this.rotation = boundAngle(this.rotation + this.TURN_RATE * delta * angDiff)
      } else {
        this.rotation = inputVector.angle()
      }
    } else {
      this.rotation = inputVector.angle()
    }

    this.addImpulse(Vector.fromMagnitudeAngle(inputMagnitude, this.rotation))
  }
}
