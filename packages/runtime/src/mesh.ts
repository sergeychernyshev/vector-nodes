import type { Geometry, Mesh, Point } from './types.js';

/** A geometry bundle containing a single mesh. */
export function meshGeometry(mesh: Mesh): Geometry {
  return { points: [], curves: [], meshes: [mesh] };
}

/** Fan-triangulate every polygon face of a mesh into triangles. */
export function triangulateMesh(mesh: Mesh): Mesh {
  const faces: number[][] = [];
  for (const face of mesh.faces) {
    for (let i = 1; i + 1 < face.length; i++) {
      faces.push([face[0]!, face[i]!, face[i + 1]!]);
    }
  }
  return { positions: mesh.positions, faces };
}

/** Triangulate every mesh in a geometry bundle. */
export function triangulateGeometry(geo: Geometry): Geometry {
  return { ...geo, meshes: geo.meshes.map(triangulateMesh) };
}

/** A flat rectangle in the X–Y plane, centered at the origin (one quad). */
export function planeMesh(width: number, height: number): Mesh {
  const w = width / 2;
  const h = height / 2;
  return {
    positions: [
      [-w, -h, 0],
      [w, -h, 0],
      [w, h, 0],
      [-w, h, 0],
    ],
    faces: [[0, 1, 2, 3]],
  };
}

/** An axis-aligned box centered at the origin (6 quad faces). */
export function boxMesh(width: number, height: number, depth: number): Mesh {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const positions: Point[] = [
    [-x, -y, -z],
    [x, -y, -z],
    [x, y, -z],
    [-x, y, -z],
    [-x, -y, z],
    [x, -y, z],
    [x, y, z],
    [-x, y, z],
  ];
  const faces = [
    [0, 1, 2, 3], // -z
    [4, 7, 6, 5], // +z
    [0, 4, 5, 1], // -y
    [3, 2, 6, 7], // +y
    [0, 3, 7, 4], // -x
    [1, 5, 6, 2], // +x
  ];
  return { positions, faces };
}

/** A subdivided plane: `countX × countY` quads over `sizeX × sizeY`, centered. */
export function gridMesh(countX: number, countY: number, sizeX: number, sizeY: number): Mesh {
  const nx = Math.max(1, Math.floor(countX));
  const ny = Math.max(1, Math.floor(countY));
  const positions: Point[] = [];
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      positions.push([(i / nx - 0.5) * sizeX, (j / ny - 0.5) * sizeY, 0]);
    }
  }
  const faces: number[][] = [];
  const stride = nx + 1;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * stride + i;
      faces.push([a, a + 1, a + 1 + stride, a + stride]);
    }
  }
  return { positions, faces };
}

/** A UV sphere of `radius` with `segments` longitudes and `rings` latitudes. */
export function uvSphere(radius: number, segments: number, rings: number): Mesh {
  const seg = Math.max(3, Math.floor(segments));
  const rng = Math.max(2, Math.floor(rings));
  const positions: Point[] = [];
  for (let r = 0; r <= rng; r++) {
    const phi = (r / rng) * Math.PI; // 0..π
    const y = Math.cos(phi) * radius;
    const ringRadius = Math.sin(phi) * radius;
    for (let s = 0; s <= seg; s++) {
      const theta = (s / seg) * 2 * Math.PI;
      positions.push([Math.cos(theta) * ringRadius, y, Math.sin(theta) * ringRadius]);
    }
  }
  const faces: number[][] = [];
  const stride = seg + 1;
  for (let r = 0; r < rng; r++) {
    for (let s = 0; s < seg; s++) {
      const a = r * stride + s;
      faces.push([a, a + 1, a + 1 + stride, a + stride]);
    }
  }
  return { positions, faces };
}

/** A capped cylinder along Y of `radius` and `height`, with `segments` sides. */
export function cylinderMesh(radius: number, height: number, segments: number): Mesh {
  const seg = Math.max(3, Math.floor(segments));
  const y = height / 2;
  const positions: Point[] = [];
  for (let s = 0; s < seg; s++) {
    const theta = (s / seg) * 2 * Math.PI;
    positions.push([Math.cos(theta) * radius, -y, Math.sin(theta) * radius]); // bottom ring
  }
  for (let s = 0; s < seg; s++) {
    const theta = (s / seg) * 2 * Math.PI;
    positions.push([Math.cos(theta) * radius, y, Math.sin(theta) * radius]); // top ring
  }
  const faces: number[][] = [];
  for (let s = 0; s < seg; s++) {
    const next = (s + 1) % seg;
    faces.push([s, next, seg + next, seg + s]); // side quad
  }
  faces.push([...Array.from({ length: seg }, (_, s) => seg - 1 - s)]); // bottom cap
  faces.push([...Array.from({ length: seg }, (_, s) => seg + s)]); // top cap
  return { positions, faces };
}

/** A cone along Y: base of `radius` at -h/2, apex at +h/2, with `segments` sides. */
export function coneMesh(radius: number, height: number, segments: number): Mesh {
  const seg = Math.max(3, Math.floor(segments));
  const y = height / 2;
  const positions: Point[] = [];
  for (let s = 0; s < seg; s++) {
    const theta = (s / seg) * 2 * Math.PI;
    positions.push([Math.cos(theta) * radius, -y, Math.sin(theta) * radius]);
  }
  const apex = positions.length;
  positions.push([0, y, 0]);
  const faces: number[][] = [];
  for (let s = 0; s < seg; s++) {
    faces.push([s, (s + 1) % seg, apex]); // side triangle
  }
  faces.push([...Array.from({ length: seg }, (_, s) => seg - 1 - s)]); // base cap
  return { positions, faces };
}
