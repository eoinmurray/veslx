import { useMemo, useRef, useEffect, type CSSProperties } from "react";
import { Image } from "lucide-react";
import { Lightbox, LightboxImage } from "@/components/gallery/components/lightbox";
import { useGalleryImages } from "./hooks/use-gallery-images";
import { useLightbox } from "./hooks/use-lightbox";
import { LoadingImage } from "./components/loading-image";
import { FigureHeader } from "./components/figure-header";
import { FigureCaption } from "./components/figure-caption";

/**
 * Hook to prevent horizontal scroll from triggering browser back/forward gestures.
 * Captures wheel events and prevents default when at scroll boundaries.
 */
function usePreventSwipeNavigation(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal scrolling
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const atLeftEdge = scrollLeft <= 0;
      const atRightEdge = scrollLeft + clientWidth >= scrollWidth - 1;

      // Prevent default if trying to scroll past boundaries
      if ((atLeftEdge && e.deltaX < 0) || (atRightEdge && e.deltaX > 0)) {
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [ref]);
}

function getImageLabel(path: string): string {
  const cleanPath = path.split(/[?#]/)[0];
  const filename = cleanPath.split('/').pop() || cleanPath;
  return filename
    .replace(/\.(png|jpg|jpeg|gif|svg|webp)$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path) || path.startsWith('//');
}

function joinUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  return `${trimmedBase}/${trimmedPath}`;
}

function getImageUrl(path: string, baseUrl?: string): string {
  if (isAbsoluteUrl(path)) return path;
  if (baseUrl) return joinUrl(baseUrl, path);
  return `/raw/${path}`;
}

export default function Gallery({
  path,
  globs = null,
  baseUrl,
  caption,
  captionLabel,
  title,
  subtitle,
  subtitles,
  size = "lg",
  limit = null,
  page = 0,
  children,
  childAlign = "right",
}: {
  path?: string;
  globs?: string[] | string[][] | null;
  baseUrl?: string;
  caption?: string;
  captionLabel?: string;
  title?: string;
  subtitle?: string;
  subtitles?: string[];
  size?: "sm" | "md" | "lg";
  limit?: number | null;
  page?: number;
  children?: React.ReactNode;
  childAlign?: "left" | "right";
}) {
  const { paths, rows, isLoading, isEmpty } = useGalleryImages({
    path,
    globs,
    limit,
    page: page,
  });

  const lightbox = useLightbox(paths.length);
  const scrollRef = useRef<HTMLDivElement>(null);
  usePreventSwipeNavigation(scrollRef);

  const galleryWidthMap: Record<"sm" | "md" | "lg", string> = {
    sm: "min(80vw, 18rem)",
    md: "min(85vw, 30rem)",
    lg: "min(90vw, 48rem)",
  };
  const galleryStyle = { "--gallery-width": galleryWidthMap[size] } as CSSProperties;

  const rowsToRender = rows.length > 0 ? rows : [paths];
  const flatPaths = rowsToRender.flat();
  const maxRowColumns = rowsToRender.reduce((max, row) => Math.max(max, row.length), 0);

  const images: LightboxImage[] = useMemo(
    () => flatPaths.map(p => ({ src: getImageUrl(p, baseUrl), label: getImageLabel(p) })),
    [flatPaths, baseUrl]
  );

  if (isLoading) {
    return (
      <figure className="not-prose py-6 md:py-8" style={galleryStyle}>
        <div className="grid grid-cols-3 gap-3 max-w-[var(--gallery-width)] mx-auto">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-sm bg-muted/20 relative overflow-hidden"
            >
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/30 to-transparent animate-shimmer"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            </div>
          ))}
        </div>
      </figure>
    );
  }

  if (isEmpty) {
    return (
      <figure className="not-prose py-12 text-center" style={galleryStyle}>
        <div className="inline-flex items-center gap-2.5 text-muted-foreground/40">
          <Image className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="font-mono text-xs uppercase tracking-widest">No images</span>
        </div>
      </figure>
    );
  }

  const isSingle = images.length === 1;
  const isTwo = images.length === 2;
  const isCompact = images.length <= 3;
  const isGroupedRows = rowsToRender.length > 1;
  const isScrollRow = images.length > 3;
  const isSingleWithChildren = images.length === 1 && children;
  // 2+ images should break out of the content width
  const shouldBreakOut = images.length >= 2;
  const breakoutClass = shouldBreakOut
    ? isGroupedRows
      ? ""
      : isScrollRow
        ? "gallery-breakout w-screen"
        : "gallery-breakout w-[var(--gallery-width)] max-w-none"
    : "";

  const imageElement = (index: number, img: LightboxImage, className?: string) => (
    <div
      key={index}
      title={img.label}
      className={`aspect-square overflow-hidden rounded-sm bg-muted/10 cursor-pointer group ${className || ''}`}
      onClick={() => lightbox.open(index)}
    >
      <LoadingImage
        src={img.src}
        alt={img.label}
        className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.02]"
      />
    </div>
  );

  return (
    <>
      <figure
        className={`not-prose relative py-6 md:py-8 ${breakoutClass}`}
        style={galleryStyle}
      >
        {!isSingleWithChildren && !isSingle && (
          <div className="max-w-[var(--content-width)] mx-auto px-[var(--page-padding)]">
            <FigureHeader title={title} subtitle={subtitle} />
          </div>
        )}

        {isSingleWithChildren ? (
          <div className={`grid items-start gap-12 md:gap-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${childAlign === 'left' ? '' : 'md:[&>div:first-child]:order-2'}`}>
            <div className="min-w-0 self-center text-sm leading-relaxed text-foreground/90 space-y-3 [&>ul]:space-y-1.5 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:space-y-1.5 [&>ol]:list-decimal [&>ol]:pl-5">
              {children}
            </div>
            <div className="min-w-0">
              <FigureHeader title={title} subtitle={subtitle} />
              {imageElement(0, images[0])}
              <FigureCaption caption={caption} label={captionLabel} />
            </div>
          </div>
        ) : isGroupedRows ? (
          <div className="space-y-6">
            {rowsToRender.map((rowPaths, rowIndex) => {
              const rowImages = rowPaths.map((p) => ({
                src: getImageUrl(p, baseUrl),
                label: getImageLabel(p),
              }));
              const offset = rowsToRender.slice(0, rowIndex).reduce((acc, row) => acc + row.length, 0);
              const rowSubtitle = subtitles?.[rowIndex];
              const rowWrapperClass = "max-w-[var(--gallery-width)] w-full mx-auto";
              const placeholders = Math.max(0, maxRowColumns - rowImages.length);
              const rowCells = [
                ...rowImages.map((img, index) => ({ img, index })),
                ...Array.from({ length: placeholders }, () => ({ img: null, index: -1 })),
              ];

              return (
                <div key={`${rowIndex}-${rowPaths.join("|")}`}>
                  <div className={rowWrapperClass}>
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${Math.max(1, maxRowColumns)}, minmax(0, 1fr))` }}
                    >
                      {rowCells.map((cell, index) => {
                        if (!cell.img) {
                          return (
                            <div
                              key={`empty-${rowIndex}-${index}`}
                              className="aspect-square rounded-sm opacity-0 pointer-events-none"
                            />
                          );
                        }
                        return imageElement(offset + cell.index, cell.img, 'w-full');
                      })}
                    </div>
                  </div>

                  {rowSubtitle && (
                    <div className="max-w-[var(--content-width)] mx-auto px-[var(--page-padding)]">
                      <FigureHeader subtitle={rowSubtitle} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : isSingle ? (
          <div className="max-w-[var(--gallery-width)] w-full mx-auto">
            <FigureHeader title={title} subtitle={subtitle} />
            {imageElement(0, images[0])}
            <FigureCaption caption={caption} label={captionLabel} />
          </div>
        ) : isCompact ? (
          <div className="flex gap-3">
            {images.map((img, index) => imageElement(index, img, 'flex-1'))}
          </div>
        ) : (
          <div ref={scrollRef} className="gallery-scroll-row flex gap-3 overflow-x-auto overscroll-x-contain pb-4">
            {images.map((img, index) => (
              <div
                key={index}
                title={img.label}
                className="flex-none w-[calc(var(--gallery-width)*0.3)] min-w-[250px] aspect-square overflow-hidden rounded-sm bg-muted/10 cursor-pointer group"
                onClick={() => lightbox.open(index)}
              >
                <LoadingImage
                  src={img.src}
                  alt={img.label}
                  className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                />
              </div>
            ))}
          </div>
        )}

        {!isSingleWithChildren && !isSingle && (
          <div className="max-w-[var(--content-width)] mx-auto px-[var(--page-padding)]">
            <FigureCaption caption={caption} label={captionLabel} />
          </div>
        )}
      </figure>

      {lightbox.isOpen && lightbox.selectedIndex !== null && (
        <Lightbox
          images={images}
          selectedIndex={lightbox.selectedIndex}
          onClose={lightbox.close}
          onPrevious={lightbox.goToPrevious}
          onNext={lightbox.goToNext}
        />
      )}
    </>
  );
}
