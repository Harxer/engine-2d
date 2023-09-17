import Blocker from './Blocker.js'
import { Polygon, Point, Segment } from '@harxer/geometry';
import getRoute from './Pathfinding.js'
import getTriangulatedGraph from './Triangulation.js'

/** Maintains a context of blockers that have been triangulated and pathfinding through this graph. */

// === Blocker construction
/** Temporary vrtices to build a new blocker. */
let constructingVertices = [];
/** Currennt state of in-progress blocker construction concavity, only used for visualization */
let constructingCcw = false
let constructionMouse = undefined;
const usingMouseMoveHandler = _ => constructionMouse !== undefined;
const constructingBlocker = _ => constructingVertices.length > 0;
let CONSTRUCTION_SNAP_DISTANCE = 8; // pixels

// === Layout management
export let boundsBlocker = undefined;
let blockers = [];
export const getHoles = _ => [...blockers];
let defaultJsonLayoutUrl = "javascript/Layout2D/layout_default.json";
export const setDefaultJsonLayoutUrl = url => defaultJsonLayoutUrl = url;

// === Triangulation
/** Track staleness of triangulation graph, reset when blockers are added */
let _needsTriangulation = true
export let triangulationTriangles = []
export const getTriangulationGraph = _ => [...triangulationTriangles]
export const forceTriangulate = getTriangulation;

export let optimizeTriangulation = true
export function triangulationOptimized(val) {
  optimizeTriangulation = val
  if (val != optimizeTriangulation) {
    _needsTriangulation = true
  }
}

/// TODO: Test if any edges overlap here in blocker creation. This means the blocker is invalid
/**
 * Provides convenience construction and render methods for polygons. Pathfinding will use the global
 * blockers array to create the world graph layout. Each object will track its original constructing
 * vertices but its final polygon may be altered in the case of unions or holes.
 * @param vertices - Array of points that make up a blocker. CW fills internally. CCW fills externally.
 * @param originalVertices - Array of vertices that formed this blocker's polygon before union.
 * @param holes - Array of polygons. Primarly used for drawing inaccessible areas. NYI.
 */
export function newBlocker(vertices, isBoundsBlocker = false) {
  // Dep: Extrude blocker to keep pathers from getting too close to blocker
  // vertices = extrudeVertices(vertices, 10)
  let originalVertices = [vertices]
  let newPolygon = new Polygon(vertices)

  // Union overlapping blockers
  for (let b = 0; b < blockers.length; b++) {
    if (newPolygon.overlaps(blockers[b].polygon)) {
      newPolygon = newPolygon.union(blockers[b].polygon)
      originalVertices = originalVertices.concat(blockers[b].originalVertices)
      b -= deleteBlocker(b)
    }
  }

  _needsTriangulation = true
  let newBlocker = new Blocker(newPolygon, originalVertices);
  blockers.push(newBlocker);
  if (isBoundsBlocker) {
    // Assumes the first blocker (bounds blocker) is a square. TODO - update
    boundsBlocker = newBlocker;
  }
}

/** Returns removal count */
function deleteBlocker(blockerIndex) {
  _needsTriangulation = true
  if (blockers[blockerIndex] === boundsBlocker) boundsBlocker = undefined
  return blockers.splice(blockerIndex, 1).length;
}

export function renderBlockers(context) {
  blockers.forEach(blocker => blocker.render(context))
}

export function addConstructionPoint(p) {
  // If using a mouse listener, snapping is enabled
  if (usingMouseMoveHandler() && constructingVertices.length >= 3) {
    let distMouseToStartSqrd = Segment.distanceSqrd(constructionMouse, constructingVertices[0])
    // Complete construction if within snap distance
    if (distMouseToStartSqrd < CONSTRUCTION_SNAP_DISTANCE * CONSTRUCTION_SNAP_DISTANCE) {
      finishConstruction(p);
      return;
    }
  }

  constructingVertices.push(p);

  // Update current construction CCW visualizer with current `constructingVertices`. */
  let averageSlope = 0
  for (let i = 0; i < constructingVertices.length; i++) {
    let v = constructingVertices[i]
    let vNext = constructingVertices[(i + 1) % constructingVertices.length]
    averageSlope += (vNext.x - v.x) * (vNext.y + v.y)
  }
  constructingCcw = (averageSlope > 0)
}

/** Handles mouse clicks with standardized control behavior:
 *
 * If left mouse button, a construction point is added. A left mouse
 * will finish a construction if constructionMouseMoveHandler is being
 * fed mouse location data and the mouse is close enough to the starting
 * construction vertex.
 * For right mouse button, if constructionMouseMoveHandler is used, a right
 * click will undo the last placed point if construction has started else
 * it will attempt to delete any blocker that the mouse is highlighted over.
 * If not using mouse location handler, right click will finish construction.
 */
export function constructionMouseSmartClickHandler(x, y, button) {
  let p = new Point(x, y);

  const LEFT_MOUSE_BUTTON = 0;
  const RIGHT_MOUSE_BUTTON = 2;

  if (LEFT_MOUSE_BUTTON === button) {
    addConstructionPoint(p);
  }

  if (RIGHT_MOUSE_BUTTON === button) {
    if (usingMouseMoveHandler() && constructingBlocker()) {
      undoConstructionPoint();
    }
    else if (!usingMouseMoveHandler() && constructingVertices.length >= 3) {
      finishConstruction();
    } else {
      // Delete blocker if contains right click
      for (let b = 0; b < blockers.length; b++) {
        if (blockers[b].polygon.containsPoint(p)) {
          deleteBlocker(b);
          break
        }
      }
    }
  }
}

/** Removes the last placed construction vertex. */
export function undoConstructionPoint() {
  constructingVertices.pop();
}

/** Finishes polygon if viable triangle created, else does nothing. */
export function finishConstruction() {
  if (constructingVertices.length >= 3) {
    newBlocker(constructingVertices, boundsBlocker === undefined)
    clearConstruction()
  }
}

export function clearConstruction() {
  constructingVertices = [];
  constructingCcw = false
  constructionMouse = undefined;
}

/** Handle mouse update. Allows for snapping when creating blockers */
export function constructionMouseMoveHandler(x, y) {
  if (constructingVertices.length === 0) {
    constructionMouse = undefined;
    return;
  }
  constructionMouse = {x, y}
}

export function renderConstruction(context) {
  // Draw postprocessed blocker
  blockers.forEach(blocker => {
    if (blocker.polygon === undefined) return
    // Draw boundaries
    context.strokeStyle = "Green";
    context.beginPath();
    blocker.vertices().forEach((vertex, i) => {
      if (i == 0) {
        context.moveTo(vertex.x, vertex.y);
      } else {
        context.lineTo(vertex.x, vertex.y);
      }
    });
    context.lineTo(blocker.vertices()[0].x, blocker.vertices()[0].y);
    context.stroke();

    // Draw holes
    context.fillStyle = "rgba(0, 0, 0, 0.6)";
    blocker.polygon.holes.forEach((hole) => {
      hole.vertices.forEach((vertex, i) => {
        if (i == 0) {
          context.beginPath();
          context.moveTo(vertex.x, vertex.y);
        } else {
          context.lineTo(vertex.x, vertex.y);
        }
      });
      context.lineTo(hole.vertices[0].x, hole.vertices[0].y);
      context.fill();
    });
  });

  // Draw construction vertices
  // let distMouseToStartSqrd = undefined
  // if (constructingVertices.length > 0) {
  //   distMouseToStartSqrd = Segment.distanceSqrd(mouse.loc, constructingVertices[0])
  // }
  context.strokeStyle = constructingCcw ? "Blue" : "Red";
  context.fillStyle = constructingCcw ? "Blue" : "Red";
  context.font = '14px sans-serif';
  for (let c = 0; c < constructingVertices.length; c++) {
    let vertex = constructingVertices[c];
    if (c == 0) {
      if (constructingVertices.length < 2) { // || distMouseToStartSqrd > 64
        context.fillText(vertex.logString(), vertex.x+5, vertex.y-5);
      } else {
        context.beginPath();
        context.arc(vertex.x, vertex.y, 8, 0, 2 * Math.PI, false);
        context.stroke();
        context.fillText((constructingVertices.length > 2) ? 'Close Polygon' : 'Too Small', vertex.x+6, vertex.y-6);
      }
    } else {
      context.fillText(vertex.logString(), vertex.x+5, vertex.y-5);
    }
    if (c > 0) {
      context.beginPath();
      context.moveTo(constructingVertices[c-1].x, constructingVertices[c-1].y);
      context.lineTo(vertex.x, vertex.y);
      context.stroke();
    }
    if (c == constructingVertices.length - 1 ) {
      context.beginPath();
      context.moveTo(vertex.x, vertex.y);
      // if (distMouseToStartSqrd > 64) {
      //   context.lineTo(mouse.loc.x, mouse.loc.y);
      // } else {
        context.lineTo(constructingVertices[0].x, constructingVertices[0].y);
      // }
      context.stroke();

      // if (distMouseToStartSqrd > 64) {
      //   context.beginPath();
      //   context.arc(mouse.loc.x, mouse.loc.y, 3, 0, 2 * Math.PI, false);
      //   context.stroke();
      // }
    }

    context.beginPath();
    context.arc(vertex.x, vertex.y, 3, 0, 2 * Math.PI, false);
    context.stroke();
  }
}

// /**
//    * Checks blocker collisions against a segment, ray, or line the starts from a vertex
//    * on the perimeter of the blocker.
//    * @param Ray ray The ray cast out to collide with any blockers.
//    * @returns undefined if no collision or ray is internal to self. Else returns a hash with
//    * the index of the blocker it collided with, the index of the side of the blocker that
//    * was collided with, and the intersection point.
//    * @example
//    * {
//    *   intersectionPoint: Point,
//    *   blocker: Blocker,
//    *   side: Segment
//    * }
//    */
// export function raycast(ray) {
//   // TODO: Sides that lay along the cast line count shouldn't count as intersect
//   // Check if ray goes inside its own blocker. If so, return undefined

//   let pierce = {
//     side: undefined,
//     distanceSqrd: undefined,
//     point: undefined
//   };

//   for (let b = 0; b < blockers.length; b++) {
//     if (blockers[b].polygon === undefined) continue
//     let pierceData = blockers[b].pierce(ray)
//     if (pierceData !== undefined &&
//       (pierce.distanceSqrd === undefined || pierceData.distanceSqrd < pierce.distanceSqrd)) {
//       pierce = pierceData
//     }
//   }

//   return pierce
// }

/** Excludes origin when return array of points arriving at destination point, avoiding blockers. */
export function route(origin, destination) {
  // move origin and destination outside of any blockers
  blockers.forEach(blocker => {
    origin = blocker.polygon.closestPointOutsideFrom(origin)
    destination = blocker.polygon.closestPointOutsideFrom(destination)
  })

  // routing = {origin: origin, destination: destination}
  let route = getRoute(getTriangulation(), origin, destination)

  // let routePolygons = (route.triangles || []).map(r => r.polygon)
  // triangulationTriangles.forEach(triangle => triangle.highlighted = routePolygons.includes(triangle))

  if (!route.path || !route.path.length) {
    return [];
  }
  return route.path.slice(1); // omit origin
  // pathfindingRoute = pathBuilder
}

/**
 * Ensure triangles are generated or regenerated if the layout was changed between the last triangulation
 */
function getTriangulation() {
  if (_needsTriangulation) {
    let holePolygons = []
    blockers.forEach(holeBlocker => {
      if (holeBlocker == boundsBlocker) return
      holePolygons.push(holeBlocker.polygon)
    })
    triangulationTriangles = getTriangulatedGraph(boundsBlocker, holePolygons)
    _needsTriangulation = false
    // if (routing !== undefined) route(routing.origin, routing.destination)
  }

  return triangulationTriangles
}

export function renderTriangulation(context) {
  triangulationTriangles.forEach(polygon => {
    context.strokeStyle = "rgba(50, 50, 200, 0.2)"
    context.fillStyle = "rgba(50, 50, 200, 0.02)"
    if (polygon.highlighted !== undefined && polygon.highlighted) {
      context.fillStyle = "rgba(50, 50, 200, 0.2)"
    }
    context.beginPath();
    context.moveTo(polygon.vertices[0].x, polygon.vertices[0].y);
    polygon.vertices.forEach(vertex => context.lineTo(vertex.x, vertex.y))
    context.lineTo(polygon.vertices[0].x, polygon.vertices[0].y);
    if (!polygon.counterclockwise) context.fill()
    context.stroke();
  });

  // pathfindingRoute.forEach(segment => {
  //   context.strokeStyle = "rgb(50, 50, 50)"
  //   context.fillStyle = "rgb(100, 100, 100)"

  //   context.beginPath()
  //   context.arc(segment.a().x, segment.a().y, 2, 0, 2 * Math.PI, false)
  //   context.stroke()
  //   context.beginPath()
  //   context.arc(segment.b().x, segment.b().y, 2, 0, 2 * Math.PI, false)
  //   context.fill()
  //   context.beginPath()
  //   context.moveTo(segment.a().x, segment.a().y)
  //   context.lineTo(segment.b().x, segment.b().y)
  //   context.stroke()
  //   // context.fillText(segment.a().logString(), segment.a().x+5, segment.a().y - 5)
  //   // context.fillText(segment.b().logString(), segment.b().x+5, segment.b().y - 5)
  // })
}

export function saveToCookies() {
  setCookie('layoutData', serialized(), 365)
}

export function serialized() {
  let serializedBlockers = []
  blockers.forEach(blocker => {
    serializedBlockers = serializedBlockers.concat(blocker.serialized())
  })
  return JSON.stringify(serializedBlockers)
}

export function reset() {
  blockers = []
  _needsTriangulation = true
  boundsBlocker = undefined
  setCookie('layoutData', '', 0)
  loadFromServer()
}

export function load() {
  if (!loadFromCookies()) {
    loadFromServer()
  }
}

/// Load cookie cached layout
function loadFromCookies() {
  let cookieData = getCookie('layoutData')
  if (cookieData !== '') {
    blockers = [];
    let blockersJson = JSON.parse(cookieData)
    blockersJson.forEach(b => newBlocker(b.map(v => new Point(v[0], v[1])), boundsBlocker === undefined))
    return true
  }
  return false
}

/// Load default server layout JSON
function loadFromServer() {
  let xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      if (!this.responseText) {
        return;
      }
      blockers = [];
      let blockersJson = JSON.parse(this.responseText)
      blockersJson.forEach(b => newBlocker(b.map(p => new Point(p[0], p[1])), boundsBlocker === undefined))

      saveToCookies()
    }
  };
  xmlhttp.open("GET", defaultJsonLayoutUrl, true);
  xmlhttp.send();
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
