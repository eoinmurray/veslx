
export function HeroSlide({
  title,
  subtitle,
  author,
  date,
}: {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
}) {
  return (
    <div>
      <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground text-balance">
        {title}
      </h1>

      {subtitle && (
        <p className="text-[clamp(1rem,2vw,1.5rem)] text-muted-foreground max-w-[50ch] leading-relaxed">
          {subtitle}
        </p>
      )}

      {(author || date) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-4">
          {author && <span>{author}</span>}
          {author && date && <span className="text-border">·</span>}
          {date && <span>{date}</span>}
        </div>
      )}
    </div>
  );
}
