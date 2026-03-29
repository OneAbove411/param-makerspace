import { useEffect, useRef, useState } from 'react';

/**
 * Simple IntersectionObserver hook for scroll reveal animations.
 * Returns a ref to attach to the element and a boolean for visibility.
 * No GSAP needed — just CSS transitions.
 */
export function useReveal(threshold = 0.1, rootMargin = '0px 0px -40px 0px') {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, visible };
}
