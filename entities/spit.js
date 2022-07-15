import EntityObject from './entity.js'
import * as Entity from './entity.js'
import Goop from './goop.js'

/**
 *
 */
export default class Spit extends EntityObject {
  constructor(x, y, velocity, size, color) {
    super(x, y, Entity.COLLIDER_FILTER.BULLET)

    this.velocity = velocity
    this.friction.magnitude(1)
    this.color = color
    this.particulate = []
    this.size = size
  }

  update() {
    super.update()

    if (this.velocity.magnitude() < 0.1) {
      this.removed = true
      return
    }
    // new Particulate(this.position.x, this.position.y, this.size * 3 / 4, COLOR.ACCENT, Vector.fromMagnitudeAngle(this.velocity.magnitude() / 4, this.velocity.flipped().angle()), 0.5)
  }

  render(context) {
    context.fillStyle = this.color
    context.beginPath()
    context.arc(this.position.x, this.position.y, this.size, 0, 2 * Math.PI, false)
    context.fill()
  }

  handleCollisions() {
    this.collisions.forEach(collider => {
      if (collider instanceof Goop) {
        this.removed = true
        return
      }
    })
  }
}
