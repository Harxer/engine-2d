# JS Engine 2D

## Core
> ./core

- Provides entity management for update and rendering systems.
- Tick clock for draw and update callbacks.
- User input helpers for key and mouse events.

## Layout
> ./helpers/layout

- Manage objects for a 2D scene for construction of pathfinding and triangulation.
- Graph triangulation (Delaunay) generation for an array of 2D n-sided polygon.
- Pathfinding (A*) through array of edge-sharing triangles.
