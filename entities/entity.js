import { Vector, isZero, anglesMatch, boundAngle } from 'hx-geometry'

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
    this.INPUT_ACCELERATION_MAX = 9000
    this.FRICTION_COEFF = 0.05
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
    this.turnRate = 6 * Math.PI // zero turnRate indicates instant turns
    this.rotation = 0.0
    this.state = STATE.NONE
    this.velocity = new Vector(0, 0)

    add(this)
  }

  update(delta) {
    if (!MOVE_STATES.includes(this.state)) return;

    if (this.velocity.magnitude() > 0.001) {
      this.position.x += this.velocity.x() * delta
      this.position.y += this.velocity.y() * delta
    }

    // The friction is calculated on the last frame's total velocity.
    // Or at the end to count it towards the next frame.
    // Apply friction (treated as fluid resistance)
    let frictionMagnitude = 0.5 * Math.pow(this.velocity.magnitude(), 2) * this.FRICTION_COEFF * delta
    let friction = Vector.fromMagnitudeAngle(frictionMagnitude, this.velocity.flipped().angle())
    this.addImpulse(friction)
  }

  /**
   *
   * @param {Vector} impulse (m/s) Velocity
   */
  addImpulse(impulse) {
    this.velocity = this.velocity.plus(impulse)
  }

  render(context) {
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

export function update(delta, timestamp) {
  // Entity.checkCollisions()
  _entities.forEach(entity => entity.update(delta, timestamp))
  dispose()
}
