import Goop from "./goop.js"
import { Vector, Segment } from '@harxer/geometry'

export function setLerpTime(ms) {
  SYNC_LERP_TIME = ms
  return SYNC_LERP_TIME
}
export let SYNC_LERP_TIME = 0.05 // sec
export function toggleShowPredictState() {
  usePredictState = !usePredictState
  return usePredictState
}
export let usePredictState = true
export function toggleShowDebug() {
  showDebug = !showDebug
  return showDebug
}
let showDebug = true

export default class SyncGoop extends Goop {
  constructor(id) {
    super(0, 0, 10)

    this.id = id
    this.prev = {
      state: {x:0,y:0},
      predictedState: {x:0, y:0}
    }
    this.predictedState = {x:0, y:0}
    this.syncLerp = SYNC_LERP_TIME
  }

  update(delta) {
    super.update(delta)

    let x = usePredictState ? this.prev.predictedState.x : this.prev.state.x
    let y = usePredictState ? this.prev.predictedState.y : this.prev.state.y
    let dX = x - this.physicsBody.position.x
    let dY = y - this.physicsBody.position.y

    let lerpPercent = (SYNC_LERP_TIME && this.syncLerp) ? Math.min((delta / this.syncLerp), 1) : 1

    this.predictedState.x += (this.prev.predictedState.x - this.predictedState.x) * lerpPercent
    this.predictedState.y += (this.prev.predictedState.y - this.predictedState.y) * lerpPercent

    this.physicsBody.position.x += dX * lerpPercent
    this.physicsBody.position.y += dY * lerpPercent
    this.physicsBody.rotation = this.prev.state.angle

    this.syncLerp = Math.max(0, this.syncLerp - delta)

    // let turnRate = 0.0174532925 * 5
    // let angDiff = anglesMatch(this.rotation, this.syncTo.angle)
    // if (angDiff != 0) {
    //   this.rotation = boundAngle(this.rotation + turnRate * angDiff)
    // } else {
    //   this.rotation = this.syncTo.angle
    // }

    this.tail.update(delta, true)
    if (dX > 0.00001 || dY > 0.00001) {
    }
  }

  sync(state, predictedState) {
    this.physicsBody.rotation = state.angle // TODO temp
    this.physicsBody.velocity = Vector.fromMagnitudeAngle(state.velocityMagnitude, state.velocityAngle)
    this.prev.state = state
    this.prev.predictedState = predictedState
    this.syncLerp = SYNC_LERP_TIME
  }

  render(context) {
    // Predicted state render
    if (showDebug) {
      const CROSSHAIR_SIZE = 20
      let x = usePredictState ? this.prev.state.x : this.predictedState.x
      let y = usePredictState ? this.prev.state.y : this.predictedState.y
      context.strokeStyle = "rgba(255, 0, 0, 0.5)"
      context.beginPath()
      context.arc(x, y, this.size, 0, Math.PI * 2, false)
      context.stroke()
      context.beginPath()
      context.moveTo(x - CROSSHAIR_SIZE, y)
      context.lineTo(x + CROSSHAIR_SIZE, y)
      context.stroke()
      context.beginPath()
      context.moveTo(x, y - CROSSHAIR_SIZE)
      context.lineTo(x, y + CROSSHAIR_SIZE)
      context.stroke()
    }

    super.render(context)

    const OFFSET = 20

    if (showDebug) {
      context.font = "800 14px Arial";
      context.textBaseline = "center"
      context.textAlign = "left"
      context.fillStyle = "gray"
      context.fillText(this.id, this.physicsBody.position.x + OFFSET, this.physicsBody.position.y + OFFSET)
    }
  }

}
