import { useMemo, type CSSProperties } from "react";
import { Image } from "lucide-react";
import { Lightbox, LightboxImage } from "@/components/gallery/components/lightbox";
import { useGalleryImages } from "./hooks/use-gallery-images";
import { useLightbox } from "./hooks/use-lightbox";
import { LoadingImage } from "./components/loading-image";
import { FigureHeader } from "./components/figure-header";
import { FigureCaption } from "./components/figure-caption";

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
      <figure className="not-prose my-8 py-6 md:py-8 border border-border/40 rounded-md px-4 md:px-6 bg-muted/10" style={galleryStyle}>
        <div className="grid grid-cols-3 gap-3 max-w-[var(--gallery-width)] mx-auto">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-muted/20 relative overflow-hidden"
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
      <figure className="not-prose my-8 py-12 text-center border border-border/40 rounded-md px-4 md:px-6 bg-muted/10" style={galleryStyle}>
        <div className="inline-flex items-center gap-2.5 text-muted-foreground/40">
          <Image className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="font-mono text-xs uppercase tracking-widest">No images</span>
        </div>
      </figure>
    );
  }

  const isSingle = images.length === 1;
  const isGroupedRows = rowsToRender.length > 1;
  const isSingleWithChildren = images.length === 1 && children;
  // 2+ images should break out of the content width
  const shouldBreakOut = images.length >= 2;
  const breakoutClass = shouldBreakOut && !isGroupedRows
    ? "gallery-breakout w-[var(--gallery-width)] max-w-none"
    : "";

  const imageElement = (index: number, img: LightboxImage, className?: string) => (
    <div
      key={index}
      title={img.label}
      className={`overflow-hidden rounded-xl border border-border/30 cursor-pointer group ${className || ''}`}
      onClick={() => lightbox.open(index)}
    >
      <LoadingImage
        src={img.src}
        alt={img.label}
        className="w-full h-auto object-contain transition-transform duration-500 ease-out group-hover:scale-[1.02]"
      />
    </div>
  );

  return (
    <>
      <figure
        className={`not-prose relative my-8 py-6 md:py-8 border border-border/40 rounded-md px-4 md:px-6 bg-muted/10 ${breakoutClass}`}
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

              return (
                <div key={`${rowIndex}-${rowPaths.join("|")}`}>
                  <div className={rowWrapperClass}>
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${Math.max(1, maxRowColumns)}, minmax(0, 1fr))` }}
                    >
                      {rowImages.map((img, index) => imageElement(offset + index, img, 'w-full'))}
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
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(images.length, 3)}, minmax(0, 1fr))` }}
          >
            {images.map((img, index) => imageElement(index, img, 'w-full'))}
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
