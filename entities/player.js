import * as Entity from './entity.js'
import Goop from './goop.js'
import Particulate from './particulate.js'
import Spit from './spit.js'
import Input from '../input.js'
import COLOR from '../color'
import { viewX, viewY } from '../world'
import { Vector } from 'hx-geometry'
import InputReader from '../input.js'

/**
 *
 */
export default class Player extends Goop {
  constructor(x, y, size) {
    super(x, y, size)

    this.colliderType = Entity.COLLIDER_FILTER.PLAYER
    this.accelerationMax = 2
    this.color = COLOR.DOMINANT
    this.friction.magnitude(0.5)
    this.velocityTerminal = 7
    this.SPIT_RATE = 80
    this.spitCooldownRemaining = 0
  }

  update(delta) {
    this.handleInput()
    super.update(delta)

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

  handleInput() {
    if (this.state == Entity.STATE.NONE) {
      let moveMod = {
        x: InputReader.isKeyPressed(InputReader.KEYCODE.RIGHT) - InputReader.isKeyPressed(InputReader.KEYCODE.LEFT),
        y: InputReader.isKeyPressed(InputReader.KEYCODE.DOWN) - InputReader.isKeyPressed(InputReader.KEYCODE.UP)
      }
      if (moveMod.x != 0 || moveMod.y != 0) {
        this.waypoints.clear()
        this.acceleration.angle(Math.atan2(moveMod.y, moveMod.x))
        this.acceleration.magnitude(this.accelerationMax)
      } else if (this.waypoints.isEmpty()) {
        this.acceleration.magnitude(0)
      }
    }
    // Mouse control
    // if (InputReader.isMouseDown() && input.mouse.withShift) {
    //   this.waypoints.add({ x: InputReader.mouseLocation().x, y: InputReader.mouseLocation().y })
    //   input.mouseDown = false
    // }
    // if (input.mouse.buttons['2'] !== undefined) {
    //   if (input.mouse.buttons['2'] === true) {
    //     this.waypoints.clear()
    //   }
    // }
  }

}
