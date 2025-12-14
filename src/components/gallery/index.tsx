import { useMemo } from "react";
import { Image } from "lucide-react";
import { Lightbox, LightboxImage } from "@/components/gallery/components/lightbox";
import { useGalleryImages } from "./hooks/use-gallery-images";
import { useLightbox } from "./hooks/use-lightbox";
import { LoadingImage } from "./components/loading-image";
import { FigureHeader } from "./components/figure-header";
import { FigureCaption } from "./components/figure-caption";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

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
}: {
  path?: string;
  globs?: string[] | null;
  caption?: string;
  captionLabel?: string;
  title?: string;
  subtitle?: string;
  limit?: number | null;
  page?: number;
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

  return (
    <>
      <figure className="not-prose relative py-6 md:py-8 -mx-[calc((var(--gallery-width)-var(--content-width))/2+var(--page-padding))]">
        <FigureHeader title={title} subtitle={subtitle} />

        <Carousel className="w-full">
          <CarouselContent className={`-ml-2 md:-ml-3 ${images.length < 3 ? 'justify-center' : ''}`}>
            {images.map((img, index) => (
              <CarouselItem
                key={index}
                className={`pl-2 md:pl-3 md:basis-1/2 lg:basis-1/3 cursor-pointer group ${images.length < 3 ? 'flex-none' : ''}`}
                onClick={() => lightbox.open(index)}
              >
                <div className="aspect-square overflow-hidden rounded-sm bg-muted/10">
                  <LoadingImage
                    src={img.src}
                    alt={img.label}
                    className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {images.length > 3 && (
            <>
              <CarouselPrevious className="left-4 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background hover:border-border" />
              <CarouselNext className="right-4 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background hover:border-border" />
            </>
          )}
        </Carousel>

        <FigureCaption caption={caption} label={captionLabel} />
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
