/**
 * Ambient declarations for non-code assets imported into renderer modules.
 *
 * Vite handles the actual bundling; TypeScript just needs to know these
 * side-effect imports resolve to a module.
 *
 * R-T1.3: strict TS — these declarations carry no `any`.
 */

declare module '*.css';
