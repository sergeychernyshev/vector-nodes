import type { Geometry } from '@vector-nodes/runtime';
import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { buildGeometryGroup, disposeGroup } from './three-scene';

export interface ThreeViewProps {
  geometry: Geometry;
}

const BACKGROUND = 0x1e1e1e;

/**
 * Three.js 3D preview: orbit camera, ground grid, and lighting, with the
 * current geometry rendered as points/curves/meshes. Re-renders the geometry
 * whenever it changes; the camera state is preserved across edits.
 */
export function ThreeView({ geometry }: ThreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const contentRef = useRef<Group | null>(null);

  // One-time scene/renderer setup, torn down on unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new Scene();
    scene.background = new Color(BACKGROUND);
    sceneRef.current = scene;

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const camera = new PerspectiveCamera(50, width / height, 0.01, 1000);
    camera.position.set(3, 3, 5);

    // Bail gracefully when WebGL is unavailable (e.g. headless test env).
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true });
    } catch {
      sceneRef.current = null;
      return;
    }
    renderer.setPixelRatio(globalThis.devicePixelRatio ?? 1);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Grid laid in the X–Y plane to match the 2D drawing/projection plane.
    const grid = new GridHelper(10, 10, 0x555555, 0x333333);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    scene.add(new AmbientLight(0xffffff, 0.6));
    const light = new DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 7);
    scene.add(light);

    const content = new Group();
    contentRef.current = content;
    scene.add(content);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      disposeGroup(content);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
      contentRef.current = null;
    };
  }, []);

  // Rebuild the rendered geometry whenever it changes.
  useEffect(() => {
    const scene = sceneRef.current;
    const previous = contentRef.current;
    if (!scene || !previous) return;
    scene.remove(previous);
    disposeGroup(previous);
    const next = buildGeometryGroup(geometry);
    contentRef.current = next;
    scene.add(next);
  }, [geometry]);

  return <div ref={containerRef} className="preview__canvas" data-testid="preview-canvas" />;
}
