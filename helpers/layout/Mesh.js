import { Polygon, Vector } from '@harxer/geometry';
import triangulateGraph from './Triangulation.js'
import { globalDebug } from '../../core/World.js';
import GraphTriangle from './GraphTriangle.js';

/**
 * A connected set of triangles within a {Layout}. Can be the hole of a containing {Mesh} tracked
 * by the `parent` reference. Each hole of this Mesh can be another Mesh - creating a nested
 * structure. Retrieving the `triangulatedGraph` of this Mesh will get the degenerate connected
 * triangles interior to its `bounds` polygon while avoiding `holes` polygons.
 * @param {Polygon} polygon - Boundary polygon of this mesh.
 * @param {[Mesh]} holes - Any Mesh holes nested in this Mesh.
 * @param {Mesh} parent - Containing mesh that this mesh is a hole in.
 */
export default class Mesh {
  constructor(polygon, holes = [], parent) {
    /** Boundary polygon. @type {Polygon} */
    this.bounds = polygon;
    /** @type {[Mesh]} */
    this.holes = holes;
    /** @type {Mesh} */
    this.parent = parent;

    /** Set to undefined if needs new triangulation compute, else array. */
    this._triangulatedGraph = undefined;
    this._area = undefined;
  }

  /** Flag mesh for new triangulation compute on next graph array retrieval. */
  needsTriangulation() {
    this._triangulatedGraph = undefined;
    this._area = undefined
  }

  /** @returns {[GraphTriangle]} */
  get triangulatedGraph() {
    if (this._triangulatedGraph === undefined) {
      try {
        this._triangulatedGraph = triangulateGraph(
          this.bounds,
          this.holes.map(hole => hole.bounds.copy.reverse())
        )
      } catch(e) {
        if (globalDebug) console.log(`No bridges. Error: ${e}`, e)
        this._triangulatedGraph = [];
      }
    }
    return this._triangulatedGraph;
  }

  get area() {
    if (this._area === undefined) {
      this._area = this.triangulatedGraph.reduce((sum, tri) => sum + tri.area, 0)
    }
    return this._area;
  }

  render(context) {
    if (this.polygon !== undefined) context.strokeStyle = "Red";
    context.fillStyle = "rgba(200, 50, 50, 0.1)"
    if (this.polygon !== undefined && this.polygon.counterclockwise) context.strokeStyle = "Blue";
    this.polygon.vertices.forEach(vertices => {
      vertices.forEach((vertex, i) => {
        if (i == 0) {
          context.beginPath();
          context.moveTo(vertex.x, vertex.y);
        } else {
          context.lineTo(vertex.x, vertex.y);
        }
      });
      context.lineTo(vertices[0].x, vertices[0].y);
      if (this.polygon === undefined || this.polygon.clockwise) context.fill();
      context.stroke();
    });
  }

  /** Returns latest mesh. This will be itself or the new hole. */
  applyHole(polygon) {
    let self = this;
    // Check overlap
    if (this.bounds.overlaps(polygon)) {
      this.needsTriangulation();
      // CCW polygon subtract from bounds, CW union
      this.bounds = this.bounds.union(polygon);
      if (globalDebug) console.log(`Union bounds`, [polygon, this.bounds])
    } else if (polygon.counterclockwise && polygon.vertices.some(vertex => !self.bounds.containsPoint(vertex))) {
      this.needsTriangulation();
      // Internal contained polygons become holes
      let newMesh;
      let iOverlappedHole = this.holes.findIndex(hole => hole.bounds.overlaps(polygon));
      if (iOverlappedHole !== -1) {
        while (iOverlappedHole !== -1) {
          let overlappedHole = this.holes.splice(iOverlappedHole, 1)[0].bounds.copy.reverse();
          let overlayHole = newMesh ? newMesh.bounds.reverse() : polygon;
          if (globalDebug) console.log(`Union hole ${overlappedHole.logString()}`, [overlappedHole])
          if (globalDebug) console.log(`  ... onto ${overlayHole.logString()}`, [overlayHole])
          let unionPolygon = overlappedHole.union(overlayHole).reverse();
          newMesh = new Mesh(unionPolygon, overlappedHole.holes.concat(newMesh ? newMesh.holes : []), this)
          if (globalDebug) console.log(`  ... new hole`, [newMesh.bounds])

          iOverlappedHole = this.holes.findIndex(hole => hole.bounds.overlaps(unionPolygon));
          if (iOverlappedHole === -1) {

            // Remove holes swallowed by new hole
            let iInternalHole = this.holes.findIndex(hole => !newMesh.bounds.contains(hole.bounds));
            while (iInternalHole !== -1) {
              if (globalDebug) console.log(`Removing smaller internal hole`, [this.holes.splice(iInternalHole, 1)])
              iInternalHole = this.holes.findIndex(hole => !newMesh.bounds.contains(hole.bounds));
            }

            this.holes.push(newMesh)
            if (globalDebug) console.log(`Adding union hole`, [newMesh.bounds])
            return newMesh;
          }
        }
      } else {
        if (this.holes.some(hole => !hole.bounds.contains(polygon))) {
          if (globalDebug) console.log(`Ignoring internal polygon.`, [polygon])
          return this;
        }
        polygon = polygon.copy.reverse();
        let newMesh = new Mesh(polygon, [], this);

        // Remove holes swallowed by new hole
        let iInternalHole = this.holes.findIndex(hole => !polygon.contains(hole.bounds));
        while (iInternalHole !== -1) {
          if (globalDebug) console.log(`Removing smaller internal hole`, [this.holes.splice(iInternalHole, 1)])
          iInternalHole = this.holes.findIndex(hole => !polygon.contains(hole.bounds));
        }

        this.holes.push(newMesh);
        if (globalDebug) console.log(`Adding non-overlapped hole`, [polygon])
        return newMesh;
      }
    } else {
      if (globalDebug) console.log(`Ignoring external polygon. CCW: ${polygon.counterclockwise}`, [polygon])
    }
    if (globalDebug) console.log(`Adding hole`, [polygon])
    return this;
    // Ignore non-overlapping counterclockwise polygons
  }

  /** Removes hole from mesh if hit by given point. @param {Point} p @returns true if removed a hole  */
  removeHoleUnderPoint(p) {
    let iHoleCollision = this.holes.findIndex(hole => !hole.bounds.containsPoint(p))
    if (iHoleCollision > -1) {
      this.holes.splice(iHoleCollision, 1);
      this.needsTriangulation();
      return true;
    }
    return false;
  }

  /** TODO - move out of this class.
   * Get random triangle in triangulated graph weighted by area.
   * @returns {GraphTriangle?}
   */
  getRandomGraphTriangle() {
    if (!this.triangulatedGraph.length) return undefined;

    const weightedPick = Math.random() * this.area;
    let aggregateArea = 0;
    for (let i = 0; i < this.triangulatedGraph.length; i++) {
      aggregateArea += this.triangulatedGraph[i].area;
      if (weightedPick < aggregateArea) {
        return this.triangulatedGraph[i];
      }
    }
    return undefined;
  }

  /** TODO - move out of this class.
   * Get random point within mesh boundary (avoiding holes).
   * @returns {{point: Point, graphTriangle: GraphTriangle}} Object with random point and graphTriangle
   * it's located inside.
   */
  getRandomPoint() {
    let randomGraphTriangle = this.getRandomGraphTriangle();
    if (randomGraphTriangle === undefined) return {};

    // Random point in parallelogram, generates points in desired triangle and reflected version of triangle
    let randomA = Math.random();
    let randomB = Math.random();
    // Test if point is in first-half of triangle forming parallelogram (tri.containsPoint(randomPoint)))
    if (randomA + randomB > 1) {
      // Rotate or twice-reflect point selected in second-half of parallelogram into first triangle.
      // This is the same as inverting the modifiers before applying to side vectors
      randomA = 1 - randomA;
      randomB = 1 - randomB;
    }

    let tri = randomGraphTriangle.triangle;
    let vA = Vector.fromSegment(tri.vertices[0], tri.vertices[1]).multiplyBy(randomA)
    let vB = Vector.fromSegment(tri.vertices[0], tri.vertices[2]).multiplyBy(randomB)
    let randomPoint = tri.vertices[0].copy.add(vA.add(vB));
    return {point: randomPoint, graphTriangle: randomGraphTriangle};
  }
}
