import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';

import { graphToFlowEdges, graphToFlowNodes } from './flow';
import { Toolbar } from './Toolbar';

const registry = createBasicRegistry();

// A small seed network so the canvas opens with draggable nodes.
const seed = createGraph({
  nodes: [
    {
      id: 'pa',
      type: 'PointArray',
      position: [80, 120],
      params: { mode: 'circle', radius: 1, count: 8 },
    },
    { id: 'out', type: 'OutputGeometry', position: [440, 160] },
  ],
  links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
});

/** Editor application shell: a top bar above a pannable/zoomable node canvas. */
export function App() {
  const nodes = graphToFlowNodes(seed, registry);
  const edges = graphToFlowEdges(seed);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar nodeCount={nodes.length} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow defaultNodes={nodes} defaultEdges={edges} fitView>
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
