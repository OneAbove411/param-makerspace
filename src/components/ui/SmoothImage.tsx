import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

/**
 * SmoothImage — Progressive image loading with crossfade reveal.
 *
 * Renders a blurred placeholder gradient (or skeleton pulse) while the
 * real image downloads, then crossfades to the loaded image over 500ms.
 * This eliminates the "white → pop" effect on project cards, hero
 * images, and avatars.
 *
 * Usage:
 *   <SmoothImage src={url} alt="..." className="w-full h-48 object-cover" />
 *
 * Props:
 *   - src:          Image URL
 *   - alt:          Alt text (required)
 *   - className:    Applied to the outer wrapper AND the img (sizing)
 *   - imgClassName: Additional classes for the <img> only (e.g. object-fit)
 *   - eager:        Set true for LCP images (skips lazy loading)
 *   - placeholderColor: Tailwind bg class for the placeholder
 */

interface SmoothImageProps {
    src: string;
    alt: string;
    className?: string;
    imgClassName?: string;
    eager?: boolean;
    placeholderColor?: string;
    width?: number;
    height?: number;
}

export function SmoothImage({
    src,
    alt,
    className,
    imgClassName,
    eager = false,
    placeholderColor = 'bg-brutal-dark/5',
    width,
    height,
}: SmoothImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // If the image is already cached (e.g. back-nav), it fires `load`
    // synchronously before our handler is attached. Check on mount.
    useEffect(() => {
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            setLoaded(true);
        }
    }, [src]);

    return (
        <div
            className={cn('relative overflow-hidden', className)}
            aria-hidden={!alt}
        >
            {/* Placeholder — visible until image loads */}
            <div
                className={cn(
                    'absolute inset-0 transition-opacity duration-500 ease-out',
                    placeholderColor,
                    loaded ? 'opacity-0' : 'opacity-100',
                )}
                aria-hidden="true"
            >
                {/* Subtle shimmer pulse */}
                {!loaded && !error && (
                    <div
                        className="absolute inset-0 motion-safe:animate-pulse"
                        style={{
                            background:
                                'linear-gradient(110deg, transparent 30%, rgba(245,243,238,0.08) 50%, transparent 70%)',
                            backgroundSize: '200% 100%',
                        }}
                    />
                )}
            </div>

            {/* Real image — fades in on load */}
            {!error && (
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                    className={cn(
                        'w-full h-full transition-opacity duration-500 ease-out',
                        loaded ? 'opacity-100' : 'opacity-0',
                        imgClassName,
                    )}
                />
            )}
        </div>
    );
}
