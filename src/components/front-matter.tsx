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

  function buildRawCandidates(pathname: string): string[] {
    const normalized = pathname.replace(/\/$/, '');
    const hasExtension = normalized.endsWith('.mdx') || normalized.endsWith('.md');

    if (hasExtension) {
      return [normalized];
    }

    if (!normalized || normalized === '/') {
      return ['/index.mdx', '/index.md', '/README.mdx', '/README.md'];
    }

    return [
      `${normalized}.mdx`,
      `${normalized}.md`,
      `${normalized}/index.mdx`,
      `${normalized}/index.md`,
      `${normalized}/README.mdx`,
      `${normalized}/README.md`,
    ];
  }

  const handleLlmsTxt = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const candidates = buildRawCandidates(location.pathname);
      let rawMdx: string | null = null;

      for (const candidate of candidates) {
        const res = await fetch(`/raw${candidate}`);
        if (res.ok) {
          rawMdx = await res.text();
          break;
        }
      }

      if (!rawMdx) {
        throw new Error('Failed to fetch');
      }
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
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-3">
              {frontmatter?.title}
            </h1>
            {config.llmsTxt && (
              <a
                href="#"
                onClick={handleLlmsTxt}
                className="font-mono text-xs text-muted-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors shrink-0"
              >
                llms.txt
              </a>
            )}
          </div>

          {/* Meta line */}
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            {frontmatter?.date && (
              <time className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                {formatDate(new Date(frontmatter.date as string))}
              </time>
            )}
          </div>

          {frontmatter?.description && (
            <div className="mt-1 flex flex-wrap text-sm items-center gap-3 text-muted-foreground">
              {frontmatter?.description}
            </div>
          )}
        </header>
      )}
    </div>
  );
}
