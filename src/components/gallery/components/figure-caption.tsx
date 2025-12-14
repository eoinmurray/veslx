import { renderMathInText } from "../lib/render-math-in-text";

export function FigureCaption({ caption, label }: { caption?: string; label?: string }) {
  if (!caption && !label) return null;

  return (
    <figcaption className="mt-4">
      <p className="text-[13px] leading-[1.6] text-muted-foreground">
        {label && (
          <span className="font-semibold text-foreground tracking-tight">
            {label}
            {caption && <span className="font-normal mx-1.5">·</span>}
          </span>
        )}
        {caption && (
          <span className="text-muted-foreground/90">
            {renderMathInText(caption)}
          </span>
        )}
      </p>
    </figcaption>
  );
}
