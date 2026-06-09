# @vector-nodes/engine

Pull-based, memoizing DAG interpreter for
[Vector Nodes](https://github.com/sergeychernyshev/vector-nodes). Evaluates a graph from its
Output node in topological order, caching results by content signature so editing a param
recomputes only the affected subtree.

```bash
npm install @vector-nodes/engine
```

Pairs the basic node definitions from `@vector-nodes/core` with operators backed by
`@vector-nodes/runtime`.

See the [project README](https://github.com/sergeychernyshev/vector-nodes#readme) for the full
design.

## License

Apache-2.0
