import EntityObject from './entity.js'
import * as Entity from './entity.js'
import COLOR from '../color'
import { viewWidth, viewHeight, viewX, viewY } from '../world'
import Player from './player.js'
import { Vector } from 'hx-geometry'
import Particulate from './particulate.js'
import Spit from './spit.js'

/**
 *
 */
export default class Goop extends EntityObject {
  constructor(x, y, size, color) {
    super(x, y, Entity.COLLIDER_FILTER.MOB)

    this.roamSpace = 200 + Math.floor(Math.random() * 800)
    this.color = color //setRgbaAlpha(color, Math.min(size/player.size, 1))
    this.size = size
    this.state = Entity.STATE.NONE
    this.tail = {
      joint: [], // [{perpLine: {cos: 0, sin: 0}, position: {x: 0: y: 0}}]
      lastLength: 0, // track length since last length check
      length: () => this.size * 2,
      reset: () => {
        this.tail.joint = []
        this.tail.lastLength = 0
        this.tail.sync()
      },
      slither: {
        MAX_ANGLE: 50 * Math.PI / 180, //(8 / (this.velocityTerminal / 7)) * Math.PI / 180
        RATE: 5 * Math.PI / 180,
        up: false,
        angle: 0, // radians
        update: () => {
          this.tail.slither.angle += this.tail.slither.RATE * (this.tail.slither.up ? 1 : -1)
          if (Math.abs(this.tail.slither.angle) >= this.tail.slither.MAX_ANGLE) {
            this.tail.slither.angle = this.tail.slither.MAX_ANGLE * (this.tail.slither.up ? 1 : -1)
            this.tail.slither.up = !this.tail.slither.up
          }
          // console.log(this.tail.slither.angle * 180 / Math.PI)
        }
      },
      sync: () => {
        let currentLen = this.tail.length()
        if (currentLen != this.tail.lastLength) {
          for (let i = 0; i < currentLen - this.tail.lastLength; i++) {
            let x = this.position.x
            let y = this.position.y
            if (this.tail.lastLength != 0) {
              x = this.tail.joint[this.tail.lastLength - 1].position.x
              y = this.tail.joint[this.tail.lastLength - 1].position.y
            }
            this.tail.joint.push({perpLine: {cos: 0, sin: 0}, position: {x: x, y: y}})
          }
          this.tail.lastLength = currentLen
        }
      },
      update: () => {
        this.tail.slither.update()
        // Record location and perpendicular rays for current tail joint
        let tailJoint = this.tail.joint.pop()
        let ang = this.velocity.angle()
        let angPerp = ang - Math.PI/2
        tailJoint.perpLine = {cos: Math.cos(angPerp), sin: Math.sin(angPerp)}
        tailJoint.position = {x: this.position.x, y: this.position.y}
        this.tail.joint.unshift(tailJoint) // TODO - not as efficient as keeping a pointer to the current tail location in an immutable array
      }
    }
    this.tail.sync()
  }

  update() {
    super.update()

    if (this.state == Entity.STATE.FLEE) { // Remove if out of bounds
      let tailEndPoint = this.tail.joint[this.tail.joint.length - 1].position
      if ((tailEndPoint.x < viewX() && this.position.x + this.size < viewX()) ||
          (tailEndPoint.x > viewX() + viewWidth() && this.position.x + this.size >  viewX() + viewWidth()) ||
          (tailEndPoint.y < viewY() && this.position.y + this.size < viewY()) ||
          (tailEndPoint.y > viewY() + viewHeight() && this.position.y + this.size > viewY() + viewHeight())) {
          this.removed = true
          return
      }
    }

    if (this.velocity.magnitude() > 0.1) {
      this.tail.update()
    }
  }

  render(context) {
    super.render(context)

    if (Entity.MOVE_STATES.includes(this.state)) {
      context.strokeStyle = (this.state == Entity.STATE.RAGE) ? COLOR.BLACK : this.color
      context.fillStyle = (this.state == Entity.STATE.RAGE) ? COLOR.BLACK : this.color

      let tailEdgeL = []
      let tailEdgeR = []
      this.tail.joint.forEach((joint, i) => {
        let spread = this.size * ((this.tail.length() - 1 - i) / (this.tail.length() - 1))
        if (i == 0) spread += this.size / 10
        let perpX = spread * joint.perpLine.cos
        let perpY = spread * joint.perpLine.sin
        tailEdgeL.push({x: joint.position.x + perpX, y: joint.position.y + perpY})
        tailEdgeR.push({x: joint.position.x - perpX, y: joint.position.y - perpY})
      })

      // tail fill
      for (let j = 0; j < tailEdgeL.length; j++) {
        context.beginPath()
        context.moveTo(tailEdgeL[j].x, tailEdgeL[j].y)
        context.lineTo(tailEdgeR[j].x, tailEdgeR[j].y)
        context.stroke()
      }

      // tail stroke
      tailEdgeR.reverse()
      context.beginPath();
      context.moveTo(tailEdgeL[0].x, tailEdgeL[0].y)
      for (let j = 1; j < tailEdgeL.length; j++) {
        let point = tailEdgeL[j]
        context.lineTo(point.x, point.y);
      }
      for (let j = 0; j < tailEdgeR.length; j++) {
        let point = tailEdgeR[j]
        context.lineTo(point.x, point.y);
      }
      context.stroke();

      // head render
      context.beginPath()
      context.arc(this.position.x, this.position.y, this.size, this.velocity.angle() - Math.PI / 2, this.velocity.angle() + Math.PI / 2, false)
      context.stroke()

      context.beginPath()
      context.arc(this.position.x, this.position.y, this.size - this.size / 4, this.velocity.angle() - Math.PI / 2, this.velocity.angle() + Math.PI / 2, false)
      context.fill()
    }
  }

  handleCollisions() {
    this.collisions.forEach(collider => {
      if (collider instanceof Player) {
        let player = collider
        if ((this.size <= player.size || this.state == Entity.STATE.RAGE) && player.state == Entity.STATE.NONE) {
          let avgTerminalVelocity = (player.velocityTerminal + this.velocityTerminal) / 2
          let velocity = player.velocity.plus(this.velocity)
          velocity.magnitude(Math.min(velocity.magnitude(), avgTerminalVelocity))
          // when velocities add to near zero, there's 360 explode spread
          let choke = (360 - (360 * (velocity.magnitude() / avgTerminalVelocity))) * Math.PI / 180
          this.explode(velocity, Math.max(choke, 80 * Math.PI / 180))
          this.removed = true
          return
        }
      } else
      if (collider instanceof Spit) {
        let spit = collider
        let avgTerminalVelocity = (spit.velocityTerminal + this.velocityTerminal) / 2
        let velocity = spit.velocity.plus(this.velocity)
        velocity.magnitude(Math.min(velocity.magnitude(), avgTerminalVelocity))
        // when velocities add to near zero, there's 360 explode spread
        let choke = (360 - (360 * (velocity.magnitude() / avgTerminalVelocity))) * Math.PI / 180
        this.explode(velocity, Math.max(choke, 80 * Math.PI / 180))
        this.removed = true
        return
      }
    })
  }

  explode(vel, choke = 360 * Math.PI / 180) {
    let color = this.state == Entity.STATE.RAGE ? COLOR.BLACK : this.color
    let count = (vel === undefined) ? 20 : 10
    let velocity = (vel === undefined) ? Vector.fromMagnitudeAngle(5, 0) : Vector.fromMagnitudeAngle(Math.min(vel.magnitude(), 6), vel.angle())
    Particulate.generate(count, choke, this.position, velocity, this.size / 2, 5, 3, 4, color)
    this.state = Entity.STATE.EXPLODED
  }
}
