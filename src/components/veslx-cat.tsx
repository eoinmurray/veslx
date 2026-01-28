import { useFileContent } from "../../plugin/src/client";
import { cn } from "@/lib/utils";
import { FigureHeader } from "@/components/gallery/components/figure-header";
import { FigureCaption } from "@/components/gallery/components/figure-caption";

interface VeslxCatProps {
  /** Path to the file */
  path: string;
  /** Optional title */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional caption */
  caption?: string;
  /** Optional caption label */
  captionLabel?: string;
  /** Optional class override */
  className?: string;
}

export function VeslxCat({
  path,
  title,
  subtitle,
  caption,
  captionLabel,
  className,
}: VeslxCatProps) {
  const { content, loading, error } = useFileContent(path);

  const header = (title || subtitle) ? (
    <div className="mb-3">
      <FigureHeader title={title} subtitle={subtitle} />
    </div>
  ) : null;
  const footer = (caption || captionLabel) ? (
    <FigureCaption caption={caption} label={captionLabel} />
  ) : null;

  if (loading) {
    return (
      <div className={cn("not-prose my-6", className)}>
        {header}
        <pre className="w-full overflow-x-auto p-4 text-xs bg-muted border border-border rounded-md font-mono">
          loading…
        </pre>
        {footer}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("not-prose my-6", className)}>
        {header}
        <pre className="w-full overflow-x-auto p-4 text-xs bg-destructive/5 border border-destructive/30 rounded-md font-mono text-destructive">
          {error}
        </pre>
        {footer}
      </div>
    );
  }

  return (
    <div className={cn("not-prose my-6", className)}>
      {header}
      <pre className="w-full overflow-x-auto p-4 text-xs bg-muted border border-border rounded-md font-mono">
        {content ?? ""}
      </pre>
      {footer}
    </div>
  );
}
