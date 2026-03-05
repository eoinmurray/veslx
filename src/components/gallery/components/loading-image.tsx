import { useState, ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingImage({
  className,
  wrapperClassName,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { wrapperClassName?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted/20", wrapperClassName)}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/40 to-transparent animate-shimmer" />
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 bg-muted/10 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center space-y-1">
            <ImageOff className="h-4 w-4 text-muted-foreground/30 mx-auto" strokeWidth={1.5} />
            <span className="text-[10px] text-muted-foreground/30 block font-mono uppercase tracking-wider">
              unavailable
            </span>
          </div>
        </div>
      )}
      <img
        {...props}
        className={cn(
          "w-full h-full",
          "transition-all duration-500 ease-out",
          isLoading ? "opacity-0 scale-[1.02]" : "opacity-100 scale-100",
          hasError && "opacity-0",
          className
        )}
        onLoad={(e) => {
          setIsLoading(false);
          props.onLoad?.(e);
        }}
        onError={(e) => {
          setIsLoading(false);
          setHasError(true);
          props.onError?.(e);
        }}
      />
    </div>
  );
}
