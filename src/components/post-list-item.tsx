import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import { ArrowRight, Presentation } from "lucide-react";

interface PostListItemProps {
  title: string;
  description?: string;
  date?: Date;
  href: string;
  external?: boolean;
  isSlides?: boolean;
}

export function PostListItem({ title, description, date, href, external, isSlides }: PostListItemProps) {
  const className = cn(
    "group block py-3 px-3 -mx-3 rounded-md",
    "transition-colors duration-150",
  );

  const content = (
    <article className="flex items-center gap-4">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-sm font-medium text-foreground",
          "group-hover:underline",
          "flex items-center gap-2"
        )}>
          <span>{title}</span>
          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-primary" />
        </div>

        {description && (
          <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
            {description}
          </div>
        )}
      </div>

      {isSlides && (
        <Presentation className="h-3 w-3 text-muted-foreground" />
      )}
      <time
        dateTime={date?.toISOString()}
        className="font-mono text-xs text-muted-foreground tabular-nums w-20 flex-shrink-0"
      >
        {date && formatDate(date)}
      </time>
    </article>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      to={href}
      className={className}
    >
      {content}
    </Link>
  );
}
