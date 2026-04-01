import { useCallback, useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ─── Constants ───
const LIGHT_MIN = 0.2;
const LIGHT_MAX = 6;
const LIGHT_DEFAULT = 2;
const SCROLL_STEP = 0.25;

// ─── Mouse/touch tracker (normalized -1..1), rAF-synced to avoid GC pressure ───
const mouse = new THREE.Vector2(0, 0);
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

function MouseTracker() {
  useEffect(() => {
    let pendingX = 0;
    let pendingY = 0;
    let rafId = 0;

    const flush = () => {
      mouse.x = pendingX;
      mouse.y = pendingY;
      rafId = 0;
    };

    const schedule = (x: number, y: number) => {
      pendingX = x;
      pendingY = y;
      if (!rafId) rafId = requestAnimationFrame(flush);
    };

    const onMove = (e: MouseEvent) => {
      schedule(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
    };

    // Touch support for mobile — use first touch point
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      schedule(
        (t.clientX / window.innerWidth) * 2 - 1,
        -(t.clientY / window.innerHeight) * 2 + 1,
      );
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchstart', onTouch);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
  return null;
}

// ─── Robot model with cursor tracking + flashlight eyes ───
function RobotModel({
  lightsOn,
  intensity,
  onToggle,
}: {
  lightsOn: boolean;
  intensity: number;
  onToggle: () => void;
}) {
  const { scene } = useGLTF('/models/robot.glb', true);
  const groupRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Object3D | null>(null);
  const leftEyeRef = useRef<THREE.Object3D | null>(null);
  const rightEyeRef = useRef<THREE.Object3D | null>(null);
  const leftEyeMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const rightEyeMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const leftPointRef = useRef<THREE.PointLight>(null!);
  const rightPointRef = useRef<THREE.PointLight>(null!);
  const { gl, camera } = useThree();

  // Click → raycast against head + body meshes only
  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const handleClick = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const meshes: THREE.Object3D[] = [];
      scene.traverse(child => {
        if ((child as THREE.Mesh).isMesh && child.name.toLowerCase() !== 'plane') {
          meshes.push(child);
        }
      });
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) onToggle();
    };
    gl.domElement.addEventListener('click', handleClick);
    return () => gl.domElement.removeEventListener('click', handleClick);
  }, [scene, gl, camera, onToggle]);

  // Apply chrome materials on mount
  useEffect(() => {
    scene.traverse((child) => {
      if (child.name === 'Cabeza') headRef.current = child;
      if (child.name === 'Sphere_3') leftEyeRef.current = child;
      if (child.name === 'Sphere_2') rightEyeRef.current = child;

      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        // Eye spheres — emissive material (will be animated per frame)
        if (name === 'sphere_2' || name === 'sphere_3') {
          const eyeMat = new THREE.MeshStandardMaterial({
            color: '#ffe8a0',
            emissive: '#ffcc00',
            emissiveIntensity: 2.0,
            metalness: 0.0,
            roughness: 0.3,
            toneMapped: false,
          });
          mesh.material = eyeMat;
          if (name === 'sphere_3') leftEyeMatRef.current = eyeMat;
          if (name === 'sphere_2') rightEyeMatRef.current = eyeMat;
        }
        // Floor plane — hide
        else if (name === 'plane') {
          mesh.visible = false;
        }
        // Everything else — brushed chrome/metal
        else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: '#aaaaaa',
            metalness: 0.85,
            roughness: 0.15,
          });
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  // Volumetric headlamp beam shader — realistic car headlight effect
  const { leftCone, rightCone, leftConeMat, rightConeMat } = useMemo(() => {
    // Cone radius matches eye sphere diameter exactly
    const geo = new THREE.ConeGeometry(2.25, 22, 48, 20, true);

    const volumetricShader = {
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffeedd) },
        uCoreColor: { value: new THREE.Color(0xffffee) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vDistFromAxis;
        varying float vDepth;

        void main() {
          vUv = uv;
          vPosition = position;

          // Distance from cone axis (center line)
          float maxRadius = 2.8;
          float heightNorm = (position.y + 11.0) / 22.0; // 0 at tip, 1 at base
          float currentMaxR = maxRadius * heightNorm;
          vDistFromAxis = currentMaxR > 0.0 ? length(position.xz) / currentMaxR : 0.0;

          // Depth along beam (0 = eye/source, 1 = far end)
          vDepth = 1.0 - heightNorm;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uCoreColor;

        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vDistFromAxis;
        varying float vDepth;

        // Simple noise for dust/atmosphere
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 3; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          // Core beam falloff — tight bright center for high-beam look
          float coreFalloff = exp(-vDistFromAxis * vDistFromAxis * 4.0);

          // Wider secondary halo
          float haloFalloff = exp(-vDistFromAxis * vDistFromAxis * 2.5) * 0.3;

          // Combine core + halo
          float beamShape = coreFalloff + haloFalloff;

          // Distance attenuation — inverse-square-ish falloff from source
          float distAtten = 1.0 / (1.0 + vDepth * vDepth * 2.5);

          // Soft fade at beam start (near eyes) and end
          float edgeFade = smoothstep(0.0, 0.12, vDepth) * smoothstep(1.0, 0.7, vDepth);

          // Atmospheric dust/scatter — animated noise
          vec2 noiseCoord = vPosition.xz * 0.3 + vec2(uTime * 0.08, uTime * 0.05);
          float dust = fbm(noiseCoord) * 0.6 + 0.4;

          // Subtle light shaft variation
          float shafts = noise(vec2(atan(vPosition.x, vPosition.z) * 3.0, vDepth * 4.0 + uTime * 0.1));
          shafts = 0.7 + shafts * 0.3;

          // Final intensity
          float intensity = beamShape * distAtten * edgeFade * dust * shafts;

          // Color: warm white core fading to amber at edges
          vec3 color = mix(uCoreColor, uColor, vDistFromAxis * 0.7 + vDepth * 0.3);

          // Add subtle chromatic fringe at beam edges (like real optics)
          color += vec3(0.05, 0.02, -0.02) * (1.0 - coreFalloff) * 0.5;

          gl_FragColor = vec4(color, intensity * uOpacity);
        }
      `,
    };

    const makeMat = () => new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffeedd) },
        uCoreColor: { value: new THREE.Color(0xffffee) },
      },
      vertexShader: volumetricShader.vertexShader,
      fragmentShader: volumetricShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const lMat = makeMat();
    const rMat = makeMat();
    const lCone = new THREE.Mesh(geo, lMat);
    const rCone = new THREE.Mesh(geo, rMat);
    lCone.renderOrder = 999;
    rCone.renderOrder = 999;
    return { leftCone: lCone, rightCone: rCone, leftConeMat: lMat, rightConeMat: rMat };
  }, []);

  // Attach cones to group on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.add(leftCone);
      groupRef.current.add(rightCone);
    }
    return () => {
      if (groupRef.current) {
        groupRef.current.remove(leftCone);
        groupRef.current.remove(rightCone);
      }
    };
  }, [leftCone, rightCone]);

  // Reusable vectors (avoid GC in render loop)
  const wp = useRef(new THREE.Vector3());
  const targetDir = useRef(new THREE.Vector3());
  const coneUp = useRef(new THREE.Vector3(0, -1, 0)); // reused each frame, no GC
  const emissiveOn = useRef(new THREE.Color('#ffcc00'));
  const emissiveOff = useRef(new THREE.Color('#111111'));
  const currentEmissive = useRef(new THREE.Color('#ffcc00'));

  // Animate: head tracking + eye glow + point lights + light ray cones
  useFrame(() => {
    if (!headRef.current) return;

    // ── Head tracking — direct assignment, zero delay ──
    headRef.current.rotation.y = mouse.x * 0.6;
    headRef.current.rotation.x = -mouse.y * 0.3;

    // ── Eye glow (the main visible effect) ──
    const normalizedIntensity = lightsOn
      ? (intensity - LIGHT_MIN) / (LIGHT_MAX - LIGHT_MIN)
      : 0;
    const targetEmissiveIntensity = lightsOn ? 1.0 + normalizedIntensity * 4.0 : 0.05;

    if (leftEyeMatRef.current) {
      leftEyeMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        leftEyeMatRef.current.emissiveIntensity, targetEmissiveIntensity, 0.12
      );
      currentEmissive.current.lerpColors(
        emissiveOff.current, emissiveOn.current,
        lightsOn ? 0.5 + normalizedIntensity * 0.5 : 0
      );
      leftEyeMatRef.current.emissive.copy(currentEmissive.current);
      leftEyeMatRef.current.color.copy(
        lightsOn ? currentEmissive.current : emissiveOff.current
      );
    }
    if (rightEyeMatRef.current) {
      rightEyeMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        rightEyeMatRef.current.emissiveIntensity, targetEmissiveIntensity, 0.12
      );
      rightEyeMatRef.current.emissive.copy(currentEmissive.current);
      rightEyeMatRef.current.color.copy(
        lightsOn ? currentEmissive.current : emissiveOff.current
      );
    }

    // ── Point lights at exact eye positions ──
    const v = wp.current;
    const pointTarget = lightsOn ? intensity * 3 : 0;
    if (leftPointRef.current) {
      leftPointRef.current.intensity = THREE.MathUtils.lerp(
        leftPointRef.current.intensity, pointTarget, 0.12
      );
    }
    if (rightPointRef.current) {
      rightPointRef.current.intensity = THREE.MathUtils.lerp(
        rightPointRef.current.intensity, pointTarget, 0.12
      );
    }
    if (leftEyeRef.current && leftPointRef.current) {
      leftEyeRef.current.getWorldPosition(v);
      leftPointRef.current.position.copy(v);
    }
    if (rightEyeRef.current && rightPointRef.current) {
      rightEyeRef.current.getWorldPosition(v);
      rightPointRef.current.position.copy(v);
    }

    // ── Volumetric light beams — update shader uniforms ──
    const coneOpacity = lightsOn ? 0.70 + normalizedIntensity * 0.18 : 0;
    const lUniforms = (leftConeMat as THREE.ShaderMaterial).uniforms;
    const rUniforms = (rightConeMat as THREE.ShaderMaterial).uniforms;
    lUniforms.uOpacity.value = THREE.MathUtils.lerp(lUniforms.uOpacity.value, coneOpacity, 0.12);
    rUniforms.uOpacity.value = THREE.MathUtils.lerp(rUniforms.uOpacity.value, coneOpacity, 0.12);
    // Animate time for dust/atmosphere movement
    const elapsed = performance.now() * 0.001;
    lUniforms.uTime.value = elapsed;
    rUniforms.uTime.value = elapsed;

    // Cone target — derived from cursor, no spotlights needed
    const coneTargetX = mouse.x * 5;
    const coneTargetY = mouse.y * 3 + 1;
    const coneTargetZ = 10;

    if (leftEyeRef.current) {
      leftEyeRef.current.getWorldPosition(v);
      leftCone.position.copy(v);
      targetDir.current.set(coneTargetX - 0.3, coneTargetY, coneTargetZ).sub(v).normalize();
      leftCone.quaternion.setFromUnitVectors(coneUp.current, targetDir.current);
      leftCone.position.addScaledVector(targetDir.current, 10);
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.getWorldPosition(v);
      rightCone.position.copy(v);
      targetDir.current.set(coneTargetX + 0.3, coneTargetY, coneTargetZ).sub(v).normalize();
      rightCone.quaternion.setFromUnitVectors(coneUp.current, targetDir.current);
      rightCone.position.addScaledVector(targetDir.current, 10);
    }

  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={1.0} position={[3.0, 1.0, 1.8]} />

      {/* Point lights at eye positions — cast warm light on robot face/body */}
      <pointLight ref={leftPointRef} color="#ffcc00" intensity={0} distance={8} decay={2} />
      <pointLight ref={rightPointRef} color="#ffcc00" intensity={0} distance={8} decay={2} />
    </group>
  );
}

// Preload the model
useGLTF.preload('/models/robot.glb', true);


// ─── Main exported component ───
interface InteractiveRobotSplineProps {
  scene?: string;
  className?: string;
}

export function InteractiveRobotSpline({ className }: InteractiveRobotSplineProps) {
  const [lightsOn, setLightsOn] = useState(false);
  const [intensity, setIntensity] = useState(LIGHT_MIN);
  const [showHint, setShowHint] = useState(false);
  const lightsOnRef = useRef(false);
  const intensityRef = useRef(LIGHT_MIN);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const flashHint = useCallback(() => {
    setShowHint(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setShowHint(false), 2000);
  }, []);

  // Click → toggle lights
  const handleClick = useCallback(() => {
    lightsOnRef.current = !lightsOnRef.current;
    setLightsOn(lightsOnRef.current);
    flashHint();
  }, [flashHint]);

  // Scroll → ramp intensity only when lights are ON (click to toggle first)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handleWheel = (e: WheelEvent) => {
      // Only intercept scroll when lights are on
      if (!lightsOnRef.current) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -SCROLL_STEP : SCROLL_STEP;
      const newIntensity = Math.max(LIGHT_MIN, Math.min(LIGHT_MAX, intensityRef.current + delta));
      intensityRef.current = newIntensity;
      setIntensity(newIntensity);
      // Turn off lights if scrolled back to minimum
      if (newIntensity <= LIGHT_MIN) {
        lightsOnRef.current = false;
        setLightsOn(false);
      }
      flashHint();
    };
    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, [flashHint]);

  const intensityPct = Math.round(((intensity - LIGHT_MIN) / (LIGHT_MAX - LIGHT_MIN)) * 100);

  const mobile = isMobile();

  return (
    <div ref={wrapperRef} className={`relative ${className || ''}`} style={{ overflow: 'visible' }}>
      <Canvas
        camera={{ position: [-0.05, 0.2, 11], fov: 28, near: 0.01, far: 100 }}
        shadows={!mobile}
        frameloop="always"
        dpr={mobile ? [1, 1] : [1, 1.5]}
        gl={{ antialias: !mobile, alpha: true, powerPreference: 'high-performance' }}
        style={{ cursor: 'pointer', background: 'transparent' }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
        }}
      >
        <MouseTracker />

        {/* Ambient fill — kept low so flashlight contrast is visible */}
        <ambientLight intensity={0.3} />

        {/* Key light — warm from upper-right */}
        <directionalLight
          position={[4, 5, 3]}
          intensity={1.2}
          color="#fffaf0"
          castShadow={!mobile}
          shadow-mapSize={mobile ? [512, 512] : [1024, 1024]}
        />

        {/* Fill light — cool from left */}
        <directionalLight position={[-3, 2, 2]} intensity={0.4} color="#aabbff" />

        {/* Rim light — from behind */}
        <directionalLight position={[0, 2, -4]} intensity={0.6} color="#ffffff" />

        {/* Environment map for chrome reflections only — background={false} keeps canvas transparent */}
        <Environment preset="city" background={false} />

        <Suspense fallback={null}>
          <RobotModel lightsOn={lightsOn} intensity={intensity} onToggle={handleClick} />
        </Suspense>
      </Canvas>

      {/* Flashlight status hint */}
      <div
        className="absolute top-4 right-4 z-20 pointer-events-none transition-opacity duration-500"
        style={{ opacity: showHint ? 1 : 0 }}
      >
        <div className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm
          font-data text-[10px] font-bold uppercase tracking-widest
          transition-all duration-300
          ${lightsOn
            ? 'bg-yellow-400/10 text-yellow-300/70 border border-yellow-400/20'
            : 'bg-white/5 text-white/30 border border-white/10'
          }
        `}>
          <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${lightsOn ? 'bg-yellow-400' : 'bg-white/30'
            }`} />
          {lightsOn ? `${intensityPct}%` : 'Off'}
        </div>
      </div>

    </div>
  );
}
