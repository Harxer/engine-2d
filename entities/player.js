import Goop from './goop.js'
import COLOR from '../color.js'
import InputPhysicsBody from './InputPhysicsBody.js'

/**
 *
 */
export default class Player extends Goop {
  constructor(x, y, size) {
    super(x, y, size)

    this.color = COLOR.DOMINANT
    this.SPIT_RATE = 80
    this.spitCooldownRemaining = 0

    this.physicsBody = new InputPhysicsBody(x, y)
  }

  // handleCollisions() {
  //   this.collisions.forEach(collider => {
  //     if (collider instanceof Goop && this.state == Entity.STATE.NONE) {
  //       let goop = collider
  //       if (this.size >= goop.size && goop.state !== Entity.STATE.RAGE) {
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
  //   // Spit spits
  //   if (Input.isMouseDown() && !Input.isMouseWithShift() && this.state == Entity.STATE.NONE) {
  //     if (this.spitCooldownRemaining <= 0) {
  //       this.spitCooldownRemaining = this.SPIT_RATE
  //       let y = Input.mouseLocation().y - (this.position.y - viewY())
  //       let x = Input.mouseLocation().x - (this.position.x - viewX())
  //       let dir = Math.atan2(y, x)
  //       const INIT_SPIT_SPEED = 30
  //       Particulate.generate(6, 10, this.position, Vector.fromMagnitudeAngle(6, dir), 4, 1, 1, 1, COLOR.ACCENT)
  //       new Spit(this.position.x, this.position.y, Vector.fromMagnitudeAngle(INIT_SPIT_SPEED, dir), 4, COLOR.TONIC)
  //     }
  //   }
  //   this.spitCooldownRemaining = Math.max(this.spitCooldownRemaining - delta, 0)
  // }

  handleInput(delta, inputVector) {
    this.physicsBody.handleInput(delta, inputVector)
  }
}
