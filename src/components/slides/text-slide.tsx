
export function TextSlide({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      {(title || subtitle) && (
        <header className="flex flex-col gap-2">
          {title && (
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-tight tracking-[-0.02em] text-foreground">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-[clamp(0.95rem,1.5vw,1.25rem)] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </header>
      )}

      {children && (
        <div className="text-[clamp(1rem,1.8vw,1.35rem)] leading-[1.6] text-foreground/90 space-y-4 [&>ul]:space-y-2 [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:space-y-2 [&>ol]:list-decimal [&>ol]:pl-6">
          {children}
        </div>
      )}
    </div>
  );
}
