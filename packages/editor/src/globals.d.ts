// Allow importing stylesheet side-effects (handled by Vite) in TS sources.
declare module '*.css';

// Raw-text imports (Vite `?raw`), used to inline the sidebar toggle icons.
declare module '*.svg?raw' {
  const text: string;
  export default text;
}
