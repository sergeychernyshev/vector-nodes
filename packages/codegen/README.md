# @vector-nodes/codegen

TypeScript/JavaScript code generator for
[Vector Nodes](https://github.com/sergeychernyshev/vector-nodes) graphs. Compiles a graph to a
standalone module whose root network becomes a default-export, named function that imports only
the helpers it uses from `@vector-nodes/runtime`.

```bash
npm install @vector-nodes/codegen
```

See the [project README](https://github.com/sergeychernyshev/vector-nodes#readme) for the full
design.

## License

Apache-2.0
