

export function SlideOutline({
  children,
  className,
  size="md"
}: {
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
}) {

  const wClasses: Record<string, string> = {
    sm: "max-w-lg",
    md: "max-w-2xl",
    lg: "max-w-5xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  };

  const wClassName = `${wClasses[size]} ${className ?? ""}`;

  const hClasses: Record<string, string> = {
    sm: "min-h-[300px]",
    md: "min-h-[400px]",
    lg: "min-h-[500px]",
    xl: "min-h-[600px]",
    full: "min-h-[600px]",
  };

  const hClassName = `${hClasses[size]} ${className ?? ""}`;

  return (
    <div className={`border rounded relative left-1/2 -translate-x-1/2 w-screen ${wClassName} ${hClassName} ${className}`}>
      {children}
    </div>
  );
}