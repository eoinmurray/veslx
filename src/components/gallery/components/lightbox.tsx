import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { FULLSCREEN_DATA_ATTR } from "@/lib/constants";

export interface LightboxImage {
  src: string;
  label: string;
}

export interface LightboxProps {
  images: LightboxImage[];
  selectedIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  showNavigation?: boolean;
}

/**
 * Fullscreen lightbox component for viewing images
 */
export function Lightbox({
  images,
  selectedIndex,
  onClose,
  onPrevious,
  onNext,
  showNavigation = true,
}: LightboxProps) {
  const current = images[selectedIndex];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-md animate-[fade-in_150ms_ease-out]"
      onClick={onClose}
      {...{ [FULLSCREEN_DATA_ATTR]: "true" }}
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[11px] text-muted-foreground/60 tabular-nums tracking-wider uppercase">
          {String(selectedIndex + 1).padStart(2, '0')}
          <span className="mx-1.5 text-muted-foreground/30">/</span>
          {String(images.length).padStart(2, '0')}
        </div>
        <button
          onClick={onClose}
          className="p-2 -m-2 text-muted-foreground/50 hover:text-foreground transition-colors duration-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Navigation: Previous */}
      {showNavigation && selectedIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="fixed left-6 top-1/2 -translate-y-1/2 z-10 p-3 -m-3 text-muted-foreground/40 hover:text-foreground transition-colors duration-200"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={1.5} />
        </button>
      )}

      {/* Navigation: Next */}
      {showNavigation && selectedIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="fixed right-6 top-1/2 -translate-y-1/2 z-10 p-3 -m-3 text-muted-foreground/40 hover:text-foreground transition-colors duration-200"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" strokeWidth={1.5} />
        </button>
      )}

      {/* Main image */}
      <div className="fixed inset-0 flex items-center justify-center p-16">
        <img
          src={current.src}
          alt={current.label}
          className="max-w-full max-h-full object-contain rounded-sm shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Caption */}
      <div
        className="fixed bottom-0 left-0 right-0 z-10 px-6 py-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-[11px] text-muted-foreground/50 tracking-wide">
          {current.label}
        </span>
      </div>
    </div>,
    document.body
  );
}
