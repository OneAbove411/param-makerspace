import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { validateEnv } from './lib/env'

// ── Fail fast if required env vars are missing ──────────────────
// This runs before React renders so developers get a clear error
// instead of cryptic Supabase failures.
try {
    validateEnv();
} catch (err) {
    // In dev, render the error in the DOM so it's visible even if
    // the console is closed. In production, log and let Supabase
    // client fall through to its own error handling.
    if (import.meta.env.DEV) {
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `<pre style="color:red;padding:2rem;font-family:monospace;white-space:pre-wrap">${(err as Error).message}</pre>`;
        }
        throw err;
    }
    console.error(err);
}

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
    // drei's <Environment> creates a scratch PMREM renderer that logs
    // "Context Lost" when it disposes after generating the cubemap.
    // Harmless — the main renderer is unaffected.
    if (first.includes('THREE.WebGLRenderer: Context Lost')) return;
  }
  _origWarn.apply(console, args as []);
};

createRoot(document.getElementById('root')!).render(
  <App />
)
