import { Suspense, lazy, useCallback } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
}

export function InteractiveRobotSpline({ scene, className }: InteractiveRobotSplineProps) {

  const onLoad = useCallback((splineApp: any) => {
    try {
      // Make background transparent so the hero dark bg shows through
      splineApp.setBackgroundColor('rgba(0,0,0,0)');

      const allObjects = splineApp.getAllObjects?.();
      if (allObjects) {
        // Keep floor visible — it catches the light spill
        allObjects.forEach((obj: any) => {
          const name = (obj.name || '').toLowerCase();
          if (name === 'plane' || name.includes('floor') || name.includes('ground')) {
            obj.visible = true;
          }
        });

        // Sunlight-tinted spot lights at high intensity so robot is clearly visible
        allObjects
          .filter((obj: any) => obj.type === 'SpotLight')
          .forEach((light: any) => {
            try { light.color = '#FFFAF0'; } catch (e) { /* noop */ }
            try { light.intensity = 1.6; } catch (e) { /* noop */ }
          });
      }

      // Store for debugging
      (window as any).__splineApp = splineApp;
    } catch (e) {
      // Scene manipulation not supported
    }
  }, []);

  return (
    <div className={`relative overflow-hidden ${className || ''}`}>
      <style>{`
        .spline-wrapper a[href*="spline"],
        .spline-wrapper > div > a {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        .spline-wrapper canvas {
          background: transparent !important;
        }
      `}</style>

      <div className="spline-wrapper w-full h-full">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-brutal-dark text-white/40">
              <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"></path>
              </svg>
            </div>
          }
        >
          <Spline
            scene={scene}
            onLoad={onLoad}
            className="w-full h-full"
          />
        </Suspense>
      </div>

      {/* Bottom gradient — covers floor plane + light spill, blends into hero */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: '50%',
          background: 'linear-gradient(to top, #111111 0%, #111111 35%, rgba(17,17,17,0.95) 50%, rgba(17,17,17,0.7) 65%, rgba(17,17,17,0.3) 80%, transparent 100%)',
        }} />

      {/* Right edge fade — hides watermark + softens right boundary */}
      <div className="absolute top-0 bottom-0 right-0 z-10 pointer-events-none"
        style={{
          width: '100px',
          background: 'linear-gradient(to left, #111111 0%, #111111 15%, transparent 100%)',
        }} />

      {/* Left edge fade — seamless blend into text column */}
      <div className="absolute top-0 bottom-0 left-0 z-10 pointer-events-none"
        style={{
          width: '60px',
          background: 'linear-gradient(to right, #111111 0%, transparent 100%)',
        }} />
    </div>
  );
}
