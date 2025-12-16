import { useCallback, useEffect, useRef, useState } from "react";
import { FULLSCREEN_DATA_ATTR } from "@/lib/constants";
import { useParams, useSearchParams } from "react-router-dom"
import Loading from "@/components/loading";
import { Header } from "@/components/header";
import { useMDXSlides } from "@/hooks/use-mdx-content";
import { slidesMdxComponents } from "@/components/slides-renderer";
import { FrontmatterProvider } from "@/lib/frontmatter-context";
import veslxConfig from "virtual:veslx-config";
import { cn } from "@/lib/utils";


export function SlidesPage() {
  const { "*": rawPath = "." } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // The path includes the .mdx extension from the route
  const mdxPath = rawPath;

  // Load the compiled MDX module (now includes slideCount export)
  const { Content, frontmatter, slideCount, loading, error } = useMDXSlides(mdxPath);

  const totalSlides = slideCount || 0;

  const [currentSlide, setCurrentSlide] = useState(0);
  const titleSlideRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to slide on initial load if query param is set
  useEffect(() => {
    const slideParam = parseInt(searchParams.get("slide") || "0", 10);
    if (slideParam > 0 && contentRef.current) {
      const slideEl = contentRef.current.querySelector(`[data-slide-index="${slideParam}"]`);
      if (slideEl) {
        slideEl.scrollIntoView({ behavior: "auto" });
      }
    }
  }, [searchParams, Content]);

  // Track current slide based on scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = entry.target.getAttribute("data-slide-index");
            if (index !== null) {
              const slideNum = index === "title" ? 0 : parseInt(index, 10);
              setCurrentSlide(slideNum);
              setSearchParams(slideNum > 0 ? { slide: String(slideNum) } : {}, { replace: true });
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    // Observe title slide
    if (titleSlideRef.current) {
      observer.observe(titleSlideRef.current);
    }

    // Observe content slides
    if (contentRef.current) {
      const slides = contentRef.current.querySelectorAll("[data-slide-index]");
      slides.forEach((slide) => observer.observe(slide));
    }

    return () => observer.disconnect();
  }, [Content, setSearchParams]);

  // Keyboard/scroll navigation helpers
  const goToPrevious = useCallback(() => {
    const prev = Math.max(0, currentSlide - 1);
    if (contentRef.current) {
      const slideEl = contentRef.current.querySelector(`[data-slide-index="${prev}"]`);
      slideEl?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentSlide]);

  const goToNext = useCallback(() => {
    const next = Math.min(totalSlides - 1, currentSlide + 1);
    if (contentRef.current) {
      const slideEl = contentRef.current.querySelector(`[data-slide-index="${next}"]`);
      slideEl?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentSlide, totalSlides]);

  // Keyboard navigation (up/down only - left/right reserved for horizontal scrolling)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  if (loading) {
    return <Loading />
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background container mx-auto max-w-4xl py-12">
        <p className="text-center text-red-600">{error.message}</p>
      </main>
    )
  }

  if (!Content) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground font-mono text-sm">
        no slides found — use "---" to separate slides
      </div>
    );
  }

  const scrollSnap = veslxConfig.slides.scrollSnap;

  return (
    <main className={cn("slides-container", scrollSnap && "slides-scroll-snap")}>
      <title>{frontmatter?.title}</title>
      <Header
        slideControls={{
          current: currentSlide,
          total: totalSlides,
          onPrevious: goToPrevious,
          onNext: goToNext,
        }}
      />
      <FrontmatterProvider frontmatter={frontmatter}>
        <div {...{[FULLSCREEN_DATA_ATTR]: "true"}}>
          <div ref={contentRef}>
            <Content components={slidesMdxComponents} />
          </div>
        </div>
      </FrontmatterProvider>
    </main>
  )
}
