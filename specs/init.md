# Vector Nodes

Plan and create data structures, types, engine and visual editor and visualizer for node-based generator for 2D and 3D.

Create a JSON-based network definition format to open/save to.

Provide options for compiling node network into TypeScript, JavaScript, WASM, Rust or potentially any other language.

I should be able to just call the resulting module from my code passing it input geometry and parameters and getting output geometry back.

Basic nodes for points, vectors, arrays of points and arrays of vectors, projection, translation, bezier curves (defined through points and vectors), suggest other node types.

Allow combining a node network into meta-nodes (effectively, functions) that can be represented as single node and expanded if needed.

For TS, JS and WASM, create wrappers to run in main thread or in a separate worker.

Editor must have a preview mode in SVG or ThreeJS with a switch between 2D and 3D mode which, effectively, just hides 3rd coordinate and projects to X-Y plane, dropping Z when displaying in SVG.

Nodes should use color-coding of types that uses Blender colorization to be able to transfer people's skills over.

Document all of these requirements in the README.md file

Create implementation plan.
