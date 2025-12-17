import { useLocation } from "react-router-dom";
import { useFrontmatter } from "@/lib/frontmatter-context";
import { formatDate } from "@/lib/format-date";
import veslxConfig from "virtual:veslx-config";

/**
 * Convert MDX content to llms.txt format.
 */
function convertToLlmsTxt(
  rawMdx: string,
  frontmatter?: { title?: string; description?: string }
): string {
  const contentWithoutFrontmatter = rawMdx.replace(/^---[\s\S]*?---\n*/, '')

  const parts: string[] = []

  const title = frontmatter?.title || 'Untitled'
  parts.push(`# ${title}`)

  if (frontmatter?.description) {
    parts.push('')
    parts.push(`> ${frontmatter.description}`)
  }

  if (contentWithoutFrontmatter.trim()) {
    parts.push('')
    parts.push(contentWithoutFrontmatter.trim())
  }

  return parts.join('\n')
}

export function FrontMatter() {
  const frontmatter = useFrontmatter();
  const location = useLocation();
  const config = veslxConfig.site;

  const rawUrl = `/raw${location.pathname.replace(/^\//, '/')}`;

  const handleLlmsTxt = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error('Failed to fetch');
      const rawMdx = await res.text();
      const llmsTxt = convertToLlmsTxt(rawMdx, frontmatter);
      const blob = new Blob([llmsTxt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      window.location.href = url;
    } catch {
      console.error('Failed to load llms.txt');
    }
  };

  return (
    <div>
      {frontmatter?.title && (
        <header className="not-prose flex flex-col gap-2 mb-8 pt-4">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-3">
            {frontmatter?.title}
          </h1>

          {/* Meta line */}
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            {frontmatter?.date && (
              <time className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                {formatDate(new Date(frontmatter.date as string))}
              </time>
            )}
            {config.llmsTxt && (
              <a
                href="#"
                onClick={handleLlmsTxt}
                className="font-mono text-xs text-muted-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors"
              >
                llms.txt
              </a>
            )}
          </div>

          {frontmatter?.description && (
            <div className="flex flex-wrap text-sm items-center gap-3 text-muted-foreground">
              {frontmatter?.description}
            </div>
          )}
        </header>
      )}
    </div>
  );
}
