import packageJson from "../../package.json";

export function Footer() {
  return (
    <footer className="py-4 mx-auto w-full max-w-[var(--content-width)] px-[var(--page-padding)]">
      <div className="flex justify-end">
        <a
          href="https://github.com/eoinmurray/veslx"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          veslx v{packageJson.version}
        </a>
      </div>
    </footer>
  );
}
