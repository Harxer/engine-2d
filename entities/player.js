import * as Entity from './entity.js'
import Goop from './goop.js'
import Particulate from './particulate.js'
import Spit from './spit.js'
import Input from '../input.js'
import COLOR from '../color'
import { viewX, viewY } from '../world'
import { Vector, isZero, anglesMatch, boundAngle } from 'hx-geometry'
import InputReader from '../input.js'

/**
 *
 */
export default class Player extends Goop {
  constructor(x, y, size) {
    super(x, y, size)

    this.colliderType = Entity.COLLIDER_FILTER.PLAYER

    this.color = COLOR.DOMINANT
    this.SPIT_RATE = 80
    this.spitCooldownRemaining = 0
  }

  update(delta, timestamp) {
    this.handleInput(delta, timestamp)
    super.update(delta)

    // this.handleSpit()
  }

  render(context) {
    super.render(context)
  }

  handleCollisions() {
    this.collisions.forEach(collider => {
      if (collider instanceof Goop && this.state == Entity.STATE.NONE) {
        let goop = collider
        if (this.size >= goop.size && goop.state !== Entity.STATE.RAGE) {
          this.size += (this.size == goop.size)
          this.tail.sync()
        } else {
          this.explode(goop.velocity)
          return
        }
      }
    })
  }
  handleSpit() {
    // Spit spits
    if (Input.isMouseDown() && !Input.isMouseWithShift() && this.state == Entity.STATE.NONE) {
      if (this.spitCooldownRemaining <= 0) {
        this.spitCooldownRemaining = this.SPIT_RATE
        let y = Input.mouseLocation().y - (this.position.y - viewY())
        let x = Input.mouseLocation().x - (this.position.x - viewX())
        let dir = Math.atan2(y, x)
        const INIT_SPIT_SPEED = 30
        Particulate.generate(6, 10, this.position, Vector.fromMagnitudeAngle(6, dir), 4, 1, 1, 1, COLOR.ACCENT)
        new Spit(this.position.x, this.position.y, Vector.fromMagnitudeAngle(INIT_SPIT_SPEED, dir), 4, COLOR.TONIC)
      }
    }
    this.spitCooldownRemaining = Math.max(this.spitCooldownRemaining - delta, 0)
  }
  handleInput(delta, timestamp) {
    let inputVector = InputReader.playerInputVectorUpdate(timestamp)

    if (this.state == Entity.STATE.NONE && inputVector.magnitude() > 0) {
      // Cheater prevention - Can't have pressed input for longer than when our last input vector was extracted
      // This check doesn't matter for the client but this code is re-used by the server.
      let inputMagnitude = Math.min(inputVector.magnitude(), delta) * this.INPUT_ACCELERATION_MAX

      // Turn if has non-instant turning
      if (!isZero(this.turnRate)) {
        let angDiff = anglesMatch(this.rotation, inputVector.angle(), this.turnRate * delta)
        if (angDiff != 0) {
          this.rotation = boundAngle(this.rotation + this.turnRate * delta * angDiff)
          // if (this.tail !== undefined) {
          //   this.tail.slither.angle = 0
          //   this.tail.slither.up = angDiff == 1
          // }
        } else {
          this.rotation = inputVector.angle()
        }
      } else {
        this.rotation = inputVector.angle()
      }

      // let tailMod = this.tail !== undefined ? this.tail.slither.angle : 0
      // this.rotation += tailMod

      this.addImpulse(Vector.fromMagnitudeAngle(inputMagnitude, this.rotation))
    }
  }
}
