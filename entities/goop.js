import EntityObject from './entity.js'
import COLOR from '../color.js'
import { Segment, Vector } from '@harxer/geometry'
import PhysicsBody, * as PhysicsBodyConstants from './PhysicsBody.js'
import * as EntityConstants from './entity.js'

const TAIL_LENGTH = 100 // Pixel length of entire tail
const TAIL_JOINTS = 34 // Number of subvisions of tail (more joints == smoother tail)

/**
 *
 */
export default class Goop extends EntityObject {
  constructor(x, y, size) {
    super(x, y, PhysicsBodyConstants.COLLIDER_FILTER.MOB)

    this.color = "gray" //setRgbaAlpha(color, Math.min(size/player.size, 1))
    this.size = size
    this.physicsBody = new PhysicsBody(x, y)

    this.tail = {
      joint: [], // [{perpLine: {cos: 0, sin: 0}, position: {x: 0: y: 0}}]
      lastLength: 0, // track length since last length check
      lastPosition: {x, y},
      length: () => TAIL_JOINTS, // this.size * 2,
      reset: () => {
        this.tail.joint = []
        this.tail.lastLength = 0
        this.tail.sync()
      },
      slither: {
        maxAngle: () => {
          let max = 50 * Math.PI / 180
          return max // * (this.physicsBody.velocity.magnitude() / this.physicsBody.velocityTerminal)
        },
        rate: this.TURN_RATE,
        up: false,
        angle: 0, // radians
        update: () => {
          this.tail.slither.angle += this.tail.slither.rate() * (this.tail.slither.up ? 1 : -1)
          if (Math.abs(this.tail.slither.angle) >= this.tail.slither.maxAngle()) {
            this.tail.slither.angle = this.tail.slither.maxAngle() * (this.tail.slither.up ? 1 : -1)
            this.tail.slither.up = !this.tail.slither.up
          }
        }
      },
      sync: () => {
        let currentLen = this.tail.length()
        if (currentLen != this.tail.lastLength) {
          for (let i = 0; i < currentLen - this.tail.lastLength; i++) {
            let x = this.physicsBody.position.x
            let y = this.physicsBody.position.y
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
        let maxJointDisplacement = TAIL_LENGTH / TAIL_JOINTS
        let lastJointDistance = Segment.distance(this.physicsBody.position, this.tail.lastPosition)

        // Only record location on distance moved threshold
        if (lastJointDistance < maxJointDisplacement) return

        // Handle move being farther than one joint increment
        let jointShifts = Math.floor(lastJointDistance / maxJointDisplacement)
        let jointDisplacement = lastJointDistance / jointShifts
        let jointVector = Vector.fromSegment(this.tail.lastPosition, this.physicsBody.position)

        // Interpolate angles between last joint noted - use bezier curve?
        // let lastJointAngle =
        // let ang = this.physicsBody.rotation

        for (let j = 1; j <= jointShifts; j++) {
          jointVector.magnitude(jointDisplacement)
          // Record location and perpendicular rays for current tail joint
          let tailJoint = this.tail.joint.pop()
          let ang = this.physicsBody.rotation
          let angPerp = ang - Math.PI/2
          tailJoint.perpLine = {cos: Math.cos(angPerp), sin: Math.sin(angPerp)} // TODO: this can be moved to render
          tailJoint.position = {x: jointVector.x() + this.physicsBody.position.x, y: jointVector.y() + this.physicsBody.position.y}
          this.tail.joint.unshift(tailJoint) // TODO - not as efficient as keeping a pointer to the current tail location in an immutable array
        }
        this.tail.lastPosition = {x: this.physicsBody.position.x, y: this.physicsBody.position.y}
      }
    }
    this.tail.sync()
  }

  update(delta) {
    super.update(delta)

    if (EntityConstants.MOVE_STATES.includes(this.state)) {
      this.physicsBody.update(delta)
    }

    if (this.physicsBody.velocity.magnitude() > 0.1) {
      this.tail.update(delta)
    }
  }

  render(context) {
    super.render(context)

    if (EntityConstants.MOVE_STATES.includes(this.state)) {
      context.strokeStyle = (this.state == EntityConstants.STATE.RAGE) ? COLOR.BLACK : this.color
      context.fillStyle = (this.state == EntityConstants.STATE.RAGE) ? COLOR.BLACK : this.color

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
      context.fillStyle = COLOR.FOREGROUND
      context.fill()
      context.fillStyle = (this.state == EntityConstants.STATE.RAGE) ? COLOR.BLACK : this.color

      // // tail fill
      // tailEdgeR.reverse()
      // for (let j = 0; j < tailEdgeL.length; j++) {
      //   context.beginPath()
      //   context.moveTo(tailEdgeL[j].x, tailEdgeL[j].y)
      //   context.lineTo(tailEdgeR[j].x, tailEdgeR[j].y)
      //   context.stroke()
      // }

      // head render
      context.beginPath()
      context.arc(this.physicsBody.position.x, this.physicsBody.position.y, this.size, this.physicsBody.rotation - Math.PI / 2, this.physicsBody.rotation + Math.PI / 2, false)
      context.stroke()

      context.beginPath()
      context.arc(this.physicsBody.position.x, this.physicsBody.position.y, this.size - this.size / 4, this.physicsBody.rotation - Math.PI / 2, this.physicsBody.rotation + Math.PI / 2, false)
      context.fill()
    }
  }

  // handleCollisions() {
  //   this.collisions.forEach(collider => {
  //     if (collider instanceof Player) {
  //       let player = collider
  //       if ((this.size <= player.size || this.state == EntityConstants.STATE.RAGE) && player.state == EntityConstants.STATE.NONE) {
  //         let avgTerminalVelocity = (player.velocityTerminal + this.physicsBody.velocityTerminal) / 2
  //         let velocity = player.velocity.plus(this.physicsBody.velocity)
  //         velocity.magnitude(Math.min(velocity.magnitude(), avgTerminalVelocity))
  //         // when velocities add to near zero, there's 360 explode spread
  //         let choke = (360 - (360 * (velocity.magnitude() / avgTerminalVelocity))) * Math.PI / 180
  //         this.explode(velocity, Math.max(choke, 80 * Math.PI / 180))
  //         this.removed = true
  //         return
  //       }
  //     } else
  //     if (collider instanceof Spit) {
  //       let spit = collider
  //       let avgTerminalVelocity = (spit.velocityTerminal + this.physicsBody.velocityTerminal) / 2
  //       let velocity = spit.velocity.plus(this.physicsBody.velocity)
  //       velocity.magnitude(Math.min(velocity.magnitude(), avgTerminalVelocity))
  //       // when velocities add to near zero, there's 360 explode spread
  //       let choke = (360 - (360 * (velocity.magnitude() / avgTerminalVelocity))) * Math.PI / 180
  //       this.explode(velocity, Math.max(choke, 80 * Math.PI / 180))
  //       this.removed = true
  //       return
  //     }
  //   })
  // }
}
