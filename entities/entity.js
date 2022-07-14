import { Vector, isZero, anglesMatch, boundAngle } from '../geometry.js'

export const STATE = {
  NONE: 0,
  EXPLODED: 1,
  REFORMING: 3,
  PHASED: 4,
  PERGATORY: 5,
  FLEE: 6,
  RAGE: 7
}

export const COLLIDER_FILTER = {
  PLAYER: 1,
  BULLET: 2,
  MOB: 4,
  WALL: 8
}
export const COLLIDER_MASK = {
  [COLLIDER_FILTER.PLAYER]: COLLIDER_FILTER.MOB | COLLIDER_FILTER.WALL,
  [COLLIDER_FILTER.BULLET]: COLLIDER_FILTER.MOB | COLLIDER_FILTER.WALL,
  [COLLIDER_FILTER.MOB]: COLLIDER_FILTER.PLAYER | COLLIDER_FILTER.BULLET | COLLIDER_FILTER.WALL,
  [COLLIDER_FILTER.WALL]: COLLIDER_FILTER.PLAYER | COLLIDER_FILTER.BULLET | COLLIDER_FILTER.MOB
}

export const MOVE_STATES = [STATE.NONE, STATE.PHASED, STATE.FLEE, STATE.RAGE]

// Todo - remove _entities exposure
export let _entities = []
export const entityCounts = {
  Goop: 0,
  Particulate: 0,
  Spit: 0,
  Player: 0
}

function add(entity) {
  _entities.push(entity)
  entityCounts[entity.constructor.name]++
}

function dispose() {
  for (let i = 0; i < _entities.length; i++) {
    if (_entities[i].removed) {
      entityCounts[_entities[i].constructor.name]--
      _entities.splice(i, 1)
      i--
    }
  }
}

/**
 * Abstract super class for all entities in the scene.
 * @param Number x The starting position of the entity along the x axis.
 * @param Number y The starting position of the entity along the y axis.
 */
export default class Entity {
  // check what 'typeof this' is in a superclass when you call a superclasses method from a subclass
  constructor(x, y, colliderType) {
    this.acceleration = new Vector(0, 0)
    this.accelerationMax = 0.4
    this.friction = new Vector(this.accelerationMax, 0) // applied velocity(+) but acceleration(0)
    this.colliderType = colliderType
    this.collisions = [] // Entities overlapping this entity
    this.position = {
      x: x,
      y: y,
      set: (x, y) => {
        this.position.x = x
        this.position.y = y
      }
    }
    this.removed = false
    this.turnRate = 20 * (Math.PI / 180.0) // zero turnRate indicates instant turns
    this.rotation = 0.0
    this.state = STATE.NONE
    this.stoppingDistance = () => this.velocity.magnitude()**2 / (2 * this.accelerationMax)
    this.stoppingVector = () => {
      let stoppingDistance = this.stoppingDistance()
      let v = new Vector(this.velocity.x(), this.velocity.y())
      v.magnitude(stoppingDistance)
      return v
    }
    this.velocity = new Vector(0, 0)
    this.velocityTerminal = 5
    this.waypoints = {
      path: [],
      set: (points) => this.waypoints.path = points,
      add: (point) => this.waypoints.path.push(point),
      isEmpty: () => this.waypoints.path.length == 0,
      clear: () => this.waypoints.path = [],
      shift: () => this.waypoints.path.splice(0, 1)
    }

    add(this)
  }

  update() {
    if (!MOVE_STATES.includes(this.state)) return;

    this.handleCollisions()

    this.handleWaypoints()

    // Turn if has non-instant turning
    if (!isZero(this.turnRate)) {
      let angDiff = anglesMatch(this.rotation, this.acceleration.angle(), this.turnRate)
      if (angDiff != 0) {
        this.rotation = boundAngle(this.rotation + this.turnRate * angDiff)
        if (this.tail !== undefined) {
          this.tail.slither.angle = 0
          this.tail.slither.up = angDiff == 1
        }
      } else {
        this.rotation = this.acceleration.angle()
      }
    } else {
      this.rotation = this.acceleration.angle()
    }

    if (isZero(this.accelerationMax - this.acceleration.magnitude())) {
      // Apply Acceleration
      let tailMod = this.tail !== undefined ? this.tail.slither.angle : 0 // TODO - Move out of entity.js
      this.acceleration.angle(this.rotation + tailMod) // OPTION 1 - on accel
      this.velocity = this.velocity.plus(this.acceleration)
      // this.velocity.angle(this.rotation + this.tail.slither.angle) // OPTION 2 - on vel
      this.velocity.magnitude(Math.min(this.velocity.magnitude(), this.velocityTerminal))
    } else if (this.velocity.magnitudeSqrd() > this.friction.magnitudeSqrd()) {
      // Apply Friction
      this.friction.angle(this.velocity.flipped().angle())
      this.velocity = this.velocity.plus(this.friction)
    } else {
      // Stop moving
      this.velocity.magnitude(0)
    }

    if (this.velocity.magnitude() > 0.001) {
      this.position.x += this.velocity.x()
      this.position.y += this.velocity.y()
    }
  }

  handleWaypoints() {
    if (!this.waypoints.isEmpty()) {
      let vWaypoint = new Vector(this.waypoints.path[0].x - this.position.x, this.waypoints.path[0].y - this.position.y)
      if (vWaypoint.magnitude() < 1) {
        this.waypoints.shift()
        this.acceleration.magnitude(0)
      } else {
        this.acceleration.magnitude(this.accelerationMax)

        if (this.state == STATE.RAGE) {
          this.acceleration.angle(vWaypoint.angle())
          // if (this.velocity.asSegment().directionTo(vWaypoint.asPoint()) > 0) {
          //   this.acceleration.angle(this.velocity.angle() + this.turnRate)
          // } else {
          //   this.acceleration.angle(this.velocity.angle() - this.turnRate)
          // }

        } else {
          let stoppingLocation = this.stoppingVector()
          this.acceleration.angle(vWaypoint.multipliedBy(0.8).minus(stoppingLocation).angle())
          if (this.waypoints.path.length > 1) { // shortcutting if there is another waypoint after the current one
            if (vWaypoint.angle() - 1/180*Math.PI <= this.velocity.angle() && this.velocity.angle() <= vWaypoint.angle() + 1/180*Math.PI) {
              this.acceleration.angle(vWaypoint.angle())
              if (vWaypoint.magnitude() <= this.stoppingDistance() * 2 || vWaypoint.magnitude() <= this.accelerationMax) this.waypoints.shift()
            }
          }
        }
      }
    }
  }

  handleCollisions() {
    /* Override in subclasses */
  }

  render(context) {
    // // Draw waypoints
    // if (!this.waypoints.isEmpty()) {
    //   context.strokeStyle = COLOR.ACCENT
    //   context.beginPath()
    //   context.moveTo(this.position.x, this.position.y)
    //   for(var w = 0; w < this.waypoints.path.length; w++) {
    //     let point = this.waypoints.path[w]
    //     context.lineTo(point.x, point.y)
    //   }
    //   context.stroke()
    //   this.waypoints.path.forEach(point => {
    //     context.beginPath()
    //     context.arc(point.x, point.y, 2, 0, 2 * Math.PI, true)
    //     context.stroke()
    //   })
    // }

    // let v = this.stoppingVector()
    // context.strokeStyle = 'blue'
    // context.beginPath()
    // context.moveTo(this.position.x, this.position.y)
    // context.lineTo(this.position.x + v.x(), this.position.y + v.y())
    // context.stroke()

    // context.strokeStyle = 'red'
    // context.beginPath()
    // context.moveTo(this.position.x, this.position.y)
    // context.lineTo(this.position.x + this.velocity.x(), this.position.y + this.velocity.y())
    // context.stroke()
  }

  /**
   * Called by the static update() before the entity update() call to populate the collisions array
   */
  static checkCollisions() {
    _entities.forEach(entity => entity.collisions = [])

    for (let e = 0; e < _entities.length - 1; e++) {
      let entity = _entities[e]
      if (entity.colliderType === undefined || !MOVE_STATES.includes(entity.state)) continue

      for (let p = e + 1; p < _entities.length; p++) {
        let peer = _entities[p]
        if (peer.colliderType === undefined || !MOVE_STATES.includes(peer.state) || !(COLLIDER_MASK[entity.colliderType] & peer.colliderType)) continue
          let xDist = Math.pow(peer.position.x - entity.position.x, 2)
          let yDist = Math.pow(peer.position.y - entity.position.y, 2)
          if (xDist + yDist < Math.pow(peer.size + entity.size, 2)) {
            entity.collisions.push(peer)
            peer.collisions.push(entity)
          }
      }
    }
  }
}

export function render(context) {
  _entities.forEach(entity => entity.render(context))
}

export function update(delta) {
  Entity.checkCollisions()
  _entities.forEach(entity => entity.update(delta))
  dispose()
}

