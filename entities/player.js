import * as Entity from './entity.js'
import Goop from './goop.js'
import Particulate from './particulate.js'
import Spit from './spit.js'
import { GAME_MODE, getGameMode } from '../world.js'
import Input from '../input.js'
import { viewX, viewY, COLOR } from '../core.js'
import { Vector } from '../geometry.js'

/**
 *
 */
export default class Player extends Goop {
  constructor(x, y, size) {
    super(x, y, size)

    this.aiMode = this.AI_MODE.NONE
    this.colliderType = Entity.COLLIDER_FILTER.PLAYER
    this.accelerationMax = 2
    this.color = COLOR.DOMINANT
    this.friction.magnitude(0.5)
    this.reform = {
      time: [],
      timeRemaining: 0,
      play: () => {
        this.state = Entity.STATE.REFORMING
        this.tail.reset()
        this.state = Entity.STATE.NONE
      }
    }
    this.velocityTerminal = 7
    this.SPIT_RATE = 80
    this.spitCooldownRemaining = 0
  }

  update(delta) {
    super.update(delta)

    // Spit spits
    if (Input.isMouseDown() && !Input.isMouseWithShift() && this.state == Entity.STATE.NONE && [GAME_MODE.HORDE, GAME_MODE.DEV].includes(getGameMode())) {
      if (this.spitCooldownRemaining <= 0) {
        this.spitCooldownRemaining = this.SPIT_RATE
        let y = Input.mouseLocation().y - (this.position.y - viewY())
        let x = Input.mouseLocation().x - (this.position.x - viewX())
        let dir = Math.atan2(y, x)
        Particulate.generate(6, 10, this.position, Vector.fromMagnitudeAngle(6, dir), 4, 1, 1, 1, COLOR.ACCENT)
        new Spit(this.position.x, this.position.y, Vector.fromMagnitudeAngle(20, dir), 4, COLOR.TONIC)
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

}
