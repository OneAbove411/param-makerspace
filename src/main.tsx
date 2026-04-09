import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── Silence known-upstream Three.js deprecation warnings ──────────────
// These messages are emitted from inside `three` / `@react-three/fiber`
// itself, not from any code in this repo. They spam the console on every
// page load of the landing hero (which renders a Three.js robot). We
// suppress ONLY these exact, verified strings — everything else still
// reaches the console unchanged.
//
//  1. "THREE.Clock: This module has been deprecated. Please use
//      THREE.Timer instead." — emitted by @react-three/fiber's internal
//      loop which still `new THREE.Clock()`s. Fix has to land upstream
//      in r3f.
//  2. "THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated.
//      Using PCFShadowMap instead." — this repo already pins the robot
//      canvas to VSMShadowMap in interactive-3d-robot.tsx, so we should
//      no longer be hitting the fallback, but drei's <Environment>
//      preset can still construct its own scratch renderer that trips
//      the default. Silencing defensively.
//
// Removing either filter should be safe the moment r3f ships a fix.
const _origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string') {
    if (first.includes('THREE.Clock: This module has been deprecated')) return;
    if (first.includes('PCFSoftShadowMap has been deprecated')) return;
  }
  _origWarn.apply(console, args as []);
};

createRoot(document.getElementById('root')!).render(
  <App />
)
