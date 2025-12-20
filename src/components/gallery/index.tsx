import { useMemo } from "react";
import { Image } from "lucide-react";
import { Lightbox, LightboxImage } from "@/components/gallery/components/lightbox";
import { useGalleryImages } from "./hooks/use-gallery-images";
import { useLightbox } from "./hooks/use-lightbox";
import { LoadingImage } from "./components/loading-image";
import { FigureHeader } from "./components/figure-header";
import { FigureCaption } from "./components/figure-caption";

function getImageLabel(path: string): string {
  const filename = path.split('/').pop() || path;
  return filename
    .replace(/\.(png|jpg|jpeg|gif|svg|webp)$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getImageUrl(path: string): string {
  return `/raw/${path}`;
}

export default function Gallery({
  path,
  globs = null,
  caption,
  captionLabel,
  title,
  subtitle,
  limit = null,
  page = 0,
  children,
  childAlign = "right",
}: {
  path?: string;
  globs?: string[] | null;
  caption?: string;
  captionLabel?: string;
  title?: string;
  subtitle?: string;
  limit?: number | null;
  page?: number;
  children?: React.ReactNode;
  childAlign?: "left" | "right";
}) {
  const { paths, isLoading, isEmpty } = useGalleryImages({
    path,
    globs,
    limit,
    page: page,
  });

  const lightbox = useLightbox(paths.length);

  const images: LightboxImage[] = useMemo(() =>
    paths.map(p => ({ src: getImageUrl(p), label: getImageLabel(p) })),
    [paths]
  );

  if (isLoading) {
    return (
      <figure className="not-prose py-6 md:py-8">
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
      <figure className="not-prose py-12 text-center">
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
  const isSingleWithChildren = images.length === 1 && children;
  // 2-3 images should break out of the content width
  const shouldBreakOut = images.length >= 2;

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
      <figure className={`not-prose relative py-6 md:py-8 ${shouldBreakOut ? (isTwo ? 'w-[75vw] ml-[calc(-37.5vw+50%)]' : isCompact ? 'w-[96vw] ml-[calc(-48vw+50%)]' : 'w-[var(--gallery-width)] ml-[calc(-45vw+50%)]') : ''}`}>
        {!isSingleWithChildren && !isSingle && (
          <div className="max-w-[var(--content-width)] mx-auto px-[var(--page-padding)]">
            <FigureHeader title={title} subtitle={subtitle} />
          </div>
        )}

        {isSingleWithChildren ? (
          <div className={`flex gap-6 ${childAlign === 'left' ? '' : 'flex-row-reverse'}`}>
            <div className="flex-1 text-sm leading-relaxed text-foreground/90 space-y-3 [&>ul]:space-y-1.5 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:space-y-1.5 [&>ol]:list-decimal [&>ol]:pl-5 flex flex-col">
              {(title || subtitle) && <div className="invisible"><FigureHeader title={title} subtitle={subtitle} /></div>}
              <div>{children}</div>
            </div>
            <div className="w-3/5 flex-shrink-0">
              <FigureHeader title={title} subtitle={subtitle} />
              {imageElement(0, images[0])}
              <FigureCaption caption={caption} label={captionLabel} />
            </div>
          </div>
        ) : isSingle ? (
          <div className="max-w-[70%] mx-auto">
            <FigureHeader title={title} subtitle={subtitle} />
            {imageElement(0, images[0])}
            <FigureCaption caption={caption} label={captionLabel} />
          </div>
        ) : isCompact ? (
          <div className="flex gap-3">
            {images.map((img, index) => imageElement(index, img, 'flex-1'))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-4">
            {images.map((img, index) => (
              <div
                key={index}
                title={img.label}
                className="flex-none w-[30%] min-w-[250px] aspect-square overflow-hidden rounded-sm bg-muted/10 cursor-pointer group"
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
