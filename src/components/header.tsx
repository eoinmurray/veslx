import { Link, useParams } from "react-router-dom";
import { ModeToggle } from "./mode-toggle";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { ChevronUp, ChevronDown } from "lucide-react";
import veslxConfig from "virtual:veslx-config";
import { cn } from "@/lib/utils";

interface HeaderProps {
  slideControls?: {
    current: number;
    total: number;
    onPrevious: () => void;
    onNext: () => void;
  };
}

export function Header({ slideControls }: HeaderProps = {}) {
  const config = veslxConfig.site;

  const { "*": path } = useParams()

  return (
    <header className={cn(
      "print:hidden",
      slideControls && "fixed top-0 left-0 right-0 z-40"
    )}>
      <div className={cn(
        "mx-auto w-full px-[var(--page-padding)] flex items-center gap-8 py-4",
        !slideControls && "max-w-[var(--content-width)]"
      )}>
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="rounded-lg font-mono py-1.5 text-sm font-medium text-muted-foreground hover:underline"
          >
            {config.name}
          </Link>
        </nav>

        <div className="flex-1" />

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          {slideControls && (
            <>
              <button
                onClick={slideControls.onPrevious}
                className="p-1.5 text-muted-foreground/70 hover:text-foreground transition-colors duration-200"
                title="Previous slide (↑)"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <span className="font-mono text-xs text-muted-foreground/70 tabular-nums min-w-[3ch] text-center">
                {slideControls.current + 1}/{slideControls.total}
              </span>
              <button
                onClick={slideControls.onNext}
                className="p-1.5 text-muted-foreground/70 hover:text-foreground transition-colors duration-200"
                title="Next slide (↓)"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </>
          )}
          {config.github && (
            <Link
              to={`https://github.com/${config.github}`}
              target="_blank"
              className="text-muted-foreground/70 hover:text-foreground transition-colors duration-300"
              aria-label="GitHub"
            >
              <SiGithub className="h-4 w-4" />
            </Link>
          )}
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}
