import EntityObject from "./entity.js"
import { Vector } from 'hx-geometry'
import COLOR from "../color"

export default class Particulate extends EntityObject {
  constructor(x, y, size, color, velocity, friction) {
    super(x, y)

    this.friction.magnitude(friction)
    this.color = color
    this.size = size
    this.startingVelocityMagnitude = velocity.magnitude()
    this.velocity = velocity
    this.alpha = 1
  }

  update() {
    super.update()

    if (this.velocity.magnitude() < 0.1) {
      this.alpha -= 0.01
      this.color = COLOR.setRgbaAlpha(this.color, this.alpha)
    }
    if (this.alpha <= 0) {
      this.removed = true
    }
  }

  render(context) {
    super.render(context)

    let size = this.size * this.alpha

    context.fillStyle = this.color
    context.beginPath()
    context.arc(
      this.position.x,
      this.position.y,
      size/2,
      0, 2 * Math.PI, false
    );
    context.fill()
  }

  /**
   * Generates particulate with initial given properties.
   * @param Number count Number of particulate.
   * @param Number choke Arc in degrees that particulate may cover.
   * @param Hash position Hash of {x: Number, y: Number} for the starting position of particulate.
   * @param Vector velocity Initial speed and direction of particulate before variance.
   * @param Number size Initial size of particulate before variance.
   * @param Number angleVariance Angle, in degrees, variance (+/-) between generated particulate.
   * @param Number speedVariance Speed variance (+/-) between generated particulate.
   * @param Number sizeVariance Size variance (+/-) between generated particulate.
   * @param String color Hue of particulate.
   */
  static generate(count, choke, position, velocity, size, angleVariance, speedVariance, sizeVariance, color) {
    choke *= (Math.PI / 180)

    for (let i = 0; i < count; i++) {
      let pDir = choke * (i/(count-1)) - choke/2 + velocity.angle() + (Math.random() * angleVariance * 2 - angleVariance) / 180 * Math.PI
      let pVel = Math.max(velocity.magnitude() + Math.random() * speedVariance * 2 - speedVariance, 0.1)
      let pSize = Math.max(size + Math.random() * sizeVariance * 2 - sizeVariance, 1)

      new Particulate(position.x, position.y, pSize, color, Vector.fromMagnitudeAngle(pVel, pDir), 0.2)
    }
  }
}
