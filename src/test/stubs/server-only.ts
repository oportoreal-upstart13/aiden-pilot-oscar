// Test stub. `server-only` is not a real package — Next aliases it in
// webpack, so plain Node cannot resolve it. Mapped here via
// tsconfig.test.json ONLY, never in the app tsconfig: pointing the real
// build at a no-op would silently disable the guard that stops
// server-only modules being imported from client components.
export {};
