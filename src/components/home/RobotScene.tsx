import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, useGLTF } from '@react-three/drei';
import { useRef, useMemo, useEffect, useState, Suspense, useCallback } from 'react';
import * as THREE from 'three';

/**
 * RobotScene — Unitree Go2 as the interactive hero element
 *
 * Behaviors:
 * - On load: "greeting" animation (tilts head up, body wiggles)
 * - Cursor follow: body and head track mouse position smoothly
 * - On click: cycles through wave / roll over / sit animations
 * - Ambient: subtle float, gentle breathing, red eye glow pulse
 *
 * The Go2 GLB is a static mesh (no skeleton), so animations are
 * done by rotating/translating the entire group.
 */

// ── Shared mouse state ──
const mouse = { x: 0, y: 0, clientX: 0, clientY: 0 };

function MouseTracker() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouse.clientX = e.clientX;
      mouse.clientY = e.clientY;
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return null;
}

// ── Animation states ──
type AnimState = 'greeting' | 'idle' | 'wave' | 'rollover' | 'sit';

// ── Interactive Go2 Dog ──
function Go2Dog({ onAnimDone }: { onAnimDone?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/go2.glb');

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    // Model is already oriented Y-up in the GLB, facing -Z
    // No additional rotation needed on the scene clone
    cloned.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material.clone();
        mat.metalness = 0.7;
        mat.roughness = 0.25;
        if (mat.color) {
          const c = mat.color;
          // Slightly brighter to be visible against dark bg
          mat.color = new THREE.Color(
            Math.min(c.r * 1.1 + 0.1, 1),
            Math.min(c.g * 1.05 + 0.08, 1),
            Math.min(c.b * 1.05 + 0.08, 1)
          );
        }
        child.material = mat;
        child.castShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  // Animation state
  const animState = useRef<AnimState>('greeting');
  const animTime = useRef(0);
  const greetingDone = useRef(false);

  // Smooth tracking targets
  const lookX = useRef(0);
  const lookY = useRef(0);

  // Click handler sets next animation
  const triggerAnim = useCallback((state: AnimState) => {
    animState.current = state;
    animTime.current = 0;
  }, []);

  // Expose triggerAnim via userData on the group
  useEffect(() => {
    if (groupRef.current) {
      (groupRef.current as any).triggerAnim = triggerAnim;
    }
  }, [triggerAnim]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    const t = state.clock.elapsedTime;
    animTime.current += delta;

    // ── Smooth cursor tracking ──
    lookX.current = THREE.MathUtils.lerp(lookX.current, mouse.x * 0.35, 0.04);
    lookY.current = THREE.MathUtils.lerp(lookY.current, mouse.y * 0.2, 0.04);

    const at = animTime.current;
    const anim = animState.current;

    if (anim === 'greeting') {
      // Greeting: tilt up, wiggle, then settle into idle
      const phase1 = Math.min(at / 0.6, 1); // tilt up (0-0.6s)
      const phase2 = Math.max(0, Math.min((at - 0.6) / 1.2, 1)); // wiggle (0.6-1.8s)
      const phase3 = Math.max(0, Math.min((at - 2.0) / 0.8, 1)); // settle (2.0-2.8s)

      const tiltUp = Math.sin(phase1 * Math.PI * 0.5) * 0.2;
      const wiggle = Math.sin(phase2 * Math.PI * 4) * 0.08 * (1 - phase2);

      g.rotation.x = -tiltUp * (1 - phase3);
      g.rotation.z = wiggle * (1 - phase3);
      g.rotation.y = -0.5 + lookX.current * phase3;
      g.position.y = -0.65 + Math.sin(phase1 * Math.PI) * 0.15 * (1 - phase3);

      if (at > 2.8 && !greetingDone.current) {
        greetingDone.current = true;
        animState.current = 'idle';
        animTime.current = 0;
        if (onAnimDone) onAnimDone();
      }
    } else if (anim === 'idle') {
      // Idle: cursor follow + gentle breathing
      const breathe = Math.sin(t * 1.8) * 0.008;
      const sway = Math.sin(t * 0.7) * 0.015;

      g.rotation.y = -0.5 + lookX.current;
      g.rotation.x = -lookY.current * 0.25 + breathe;
      g.rotation.z = sway;
      g.position.y = -0.65 + breathe * 2;
    } else if (anim === 'wave') {
      // Wave: lean left, tilt, wiggle rapidly
      const dur = 1.8;
      const p = Math.min(at / dur, 1);
      const easeInOut = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

      const leanPhase = easeInOut < 0.5 ? easeInOut * 2 : (1 - easeInOut) * 2;
      g.rotation.z = Math.sin(at * 12) * 0.06 * leanPhase + leanPhase * 0.15;
      g.rotation.x = -leanPhase * 0.1;
      g.rotation.y = -0.5 + lookX.current;
      g.position.y = -0.65 + leanPhase * 0.1;

      if (at >= dur) {
        animState.current = 'idle';
        animTime.current = 0;
      }
    } else if (anim === 'rollover') {
      // Roll over: full 360° roll around Z axis
      const dur = 2.0;
      const p = Math.min(at / dur, 1);
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

      g.rotation.z = ease * Math.PI * 2;
      g.rotation.y = -0.5;
      g.rotation.x = 0;
      g.position.y = -0.65 + Math.sin(ease * Math.PI) * 0.3;

      if (at >= dur) {
        animState.current = 'idle';
        animTime.current = 0;
      }
    } else if (anim === 'sit') {
      // Sit: tilt back, lower rear
      const dur = 2.0;
      const p = Math.min(at / dur, 1);
      const upPhase = p < 0.4 ? p / 0.4 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      const ease = Math.sin(upPhase * Math.PI * 0.5);

      g.rotation.x = ease * 0.25;
      g.rotation.y = -0.5 + lookX.current * (1 - ease * 0.5);
      g.rotation.z = 0;
      g.position.y = -0.65 - ease * 0.08;

      if (at >= dur) {
        animState.current = 'idle';
        animTime.current = 0;
      }
    }
  });

  return (
    <group ref={groupRef} scale={3.0} position={[0, -0.65, 0]} rotation={[0, -0.5, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload('/models/go2.glb');

// ── Red eye glow points ──
function EyeGlow() {
  const ref = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!ref.current) return;
    // Pulse the eye glow
    ref.current.intensity = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
  });

  return (
    <>
      <pointLight ref={ref} position={[1.2, 0.2, 1]} color="#C4291E" intensity={0.6} distance={5} decay={2} />
    </>
  );
}

// ── Ambient particles ──
function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 30;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6 - 3;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#C4291E" size={0.03} transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

// ── Click handler inside Canvas ──
function ClickHandler({ dogRef }: { dogRef: React.RefObject<THREE.Group | null> }) {
  const { gl } = useThree();
  const clickCount = useRef(0);
  const anims: AnimState[] = ['wave', 'rollover', 'sit'];

  useEffect(() => {
    const handler = () => {
      if (!dogRef.current) return;
      const triggerAnim = (dogRef.current as any).triggerAnim;
      if (triggerAnim) {
        const anim = anims[clickCount.current % anims.length];
        triggerAnim(anim);
        clickCount.current++;
      }
    };
    const canvas = gl.domElement;
    canvas.addEventListener('click', handler);
    return () => canvas.removeEventListener('click', handler);
  }, [gl, dogRef]);

  return null;
}

// ── Main Export ──
export function RobotScene() {
  const [mounted, setMounted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const dogGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Slight delay so hero text renders first
    const timer = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleGreetingDone = useCallback(() => {
    setShowHint(true);
    // Hide hint after 3 seconds
    setTimeout(() => setShowHint(false), 3000);
  }, []);

  if (!mounted) return <div className="w-full h-full" />;

  return (
    <div className="w-full h-full relative" style={{ cursor: 'pointer' }}>
      {/* Click hint */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 font-data text-[11px] text-brutal-bg/40 uppercase tracking-[0.25em] transition-all duration-700 ${showHint ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      >
        Click me!
      </div>

      <Canvas
        camera={{ position: [0, 0.3, 4], fov: 45, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{
          width: '100%',
          height: '100%',
          opacity: 0,
          animation: 'robotFadeIn 1.2s ease-out 0.2s forwards',
        }}
      >
        <Suspense fallback={null}>
          <MouseTracker />

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 6, 4]} intensity={2.5} color="#ffffff" />
          <directionalLight position={[-4, 3, 3]} intensity={1.0} color="#aabbff" />
          <directionalLight position={[0, -2, 3]} intensity={0.4} color="#C4291E" />
          <hemisphereLight args={['#ffffff', '#444444', 0.8]} />
          <EyeGlow />

          {/* The Go2 dog */}
          <Float speed={1.5} rotationIntensity={0.02} floatIntensity={0.06}>
            <group ref={dogGroupRef}>
              <Go2Dog onAnimDone={handleGreetingDone} />
            </group>
          </Float>

          <ClickHandler dogRef={dogGroupRef} />
          <Particles />
        </Suspense>
      </Canvas>

      <style>{`@keyframes robotFadeIn { to { opacity: 1; } }`}</style>
    </div>
  );
}
