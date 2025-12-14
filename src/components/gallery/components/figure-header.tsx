import { renderMathInText } from "../lib/render-math-in-text";

export function FigureHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  if (!title && !subtitle) return null;

  return (
    <div className="mb-4">
      {title && (
        <h3 className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
          {renderMathInText(title)}
        </h3>
      )}
      {subtitle && (
        <p className="text-[13px] text-muted-foreground/80 leading-relaxed mt-1">
          {renderMathInText(subtitle)}
        </p>
      )}
    </div>
  );
}
