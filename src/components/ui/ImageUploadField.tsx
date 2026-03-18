import React, { useRef } from 'react';
import { Image as ImageIcon, X, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ImageUploadFieldProps {
  /** Label shown above the field */
  label?: string;
  /** Currently saved URL (from DB) — shown when no local file is selected */
  currentUrl?: string | null;
  /** Locally-selected File object (not yet uploaded) */
  file?: File | null;
  /** Called when user picks a new file */
  onChange: (file: File | null) => void;
  /** Called when user explicitly clears the current saved image */
  onClear?: () => void;
  /** Whether to accept only images */
  accept?: string;
  className?: string;
}

/**
 * ImageUploadField
 *
 * Shows:
 *  - A thumbnail of the currently-saved image (currentUrl) when no local file is chosen
 *  - A thumbnail of the locally-selected file (object URL) when a file is staged
 *  - A dashed upload zone when neither exists
 *
 * The preview thumbnail is always visible alongside the filename so the user
 * never has to guess what they've selected.
 */
export function ImageUploadField({
  label,
  currentUrl,
  file,
  onChange,
  onClear,
  accept = 'image/*',
  className,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive the preview src: local file takes priority over saved URL
  const previewSrc = file
    ? URL.createObjectURL(file)
    : currentUrl || null;

  const hasImage = !!previewSrc;
  const filename = file?.name ?? (currentUrl ? currentUrl.split('/').pop() : null);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    onChange(picked);
    // Reset input value so the same file can be re-selected after clearing
    e.target.value = '';
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    onClear?.();
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="font-data text-sm font-bold text-brutal-dark block mb-2">
          {label}
        </label>
      )}

      <div
        onClick={handleClick}
        className={cn(
          'relative w-full rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-all duration-200 group',
          hasImage
            ? 'border-brutal-dark/30 hover:border-brutal-dark bg-white'
            : 'border-brutal-dark/20 hover:border-brutal-dark/50 bg-brutal-dark/5 hover:bg-brutal-dark/10'
        )}
      >
        {hasImage ? (
          <div className="flex items-center gap-3 p-3">
            {/* Left: fixed-size thumbnail */}
            <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark/5">
              <img
                src={previewSrc!}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Right: filename + change/clear controls */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <ImageIcon className="w-3.5 h-3.5 text-brutal-dark/40 flex-shrink-0" />
                <span
                  className="font-data text-xs text-brutal-dark/70 truncate"
                  title={filename ?? ''}
                >
                  {filename ?? 'Current image'}
                </span>
              </div>
              <p className="font-data text-[10px] text-brutal-dark/40">
                Click anywhere to change
              </p>
              {(file || (currentUrl && onClear)) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="self-start flex items-center gap-1 px-2 py-1 rounded text-[10px] font-data font-bold text-brutal-red hover:bg-brutal-red/10 transition-colors border border-brutal-red/20"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            {/* Hover overlay sits over the whole row */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
          </div>
        ) : (
          /* ── Empty state: upload zone ── */
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-brutal-dark/10 flex items-center justify-center mb-3 group-hover:bg-brutal-dark/20 transition-colors">
              <ImageIcon className="w-5 h-5 text-brutal-dark/40" />
            </div>
            <p className="font-data text-sm font-bold text-brutal-dark/60 mb-1">
              Click to upload image
            </p>
            <p className="font-data text-xs text-brutal-dark/40">
              PNG, JPG, WEBP · Max 5MB
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
