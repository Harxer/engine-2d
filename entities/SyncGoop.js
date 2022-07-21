import Goop from "./goop.js"
import { Vector, Segment } from 'hx-geometry'

const SYNC_LERP_TIME = 0.1 // sec

export default class SyncGoop extends Goop {
  constructor(id) {
    super(100, 100, 10)

    this.id = id
    this.latest = {x:100, y:100}
  }

  update(delta) {
    super.update(delta)

    let lerpTime = SYNC_LERP_TIME ? Math.min((delta / SYNC_LERP_TIME), 1) : 1
    this.physicsBody.position.x += (this.latest.x - this.physicsBody.position.x) * lerpTime
    this.physicsBody.position.y += (this.latest.y - this.physicsBody.position.y) * lerpTime
    this.physicsBody.rotation = this.latest.angle

    // let turnRate = 0.0174532925 * 5
    // let angDiff = anglesMatch(this.rotation, this.syncTo.angle)
    // if (angDiff != 0) {
    //   this.rotation = boundAngle(this.rotation + turnRate * angDiff)
    // } else {
    //   this.rotation = this.syncTo.angle
    // }

    if (Segment.distanceSqrd(this.physicsBody.position, this.latest) > 0.1 * 0.1) {
      this.tail.update(delta, true)
    }
  }

  sync(state) {
    this.physicsBody.rotation = state.angle // TODO temp
    this.physicsBody.velocity = Vector.fromMagnitudeAngle(state.velocityMagnitude, state.velocityAngle)
    this.latest = state
  }

  render(context) {
    super.render(context)

    const OFFSET = 20

    context.font = "800 14px Arial";
    context.textBaseline = "center"
    context.textAlign = "left"
    context.fillStyle = "gray"

    context.fillText(this.id, this.physicsBody.position.x + OFFSET, this.physicsBody.position.y + OFFSET)
  }

}
