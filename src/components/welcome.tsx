import veslxConfig from "virtual:veslx-config";

export function Welcome() {
  const config = veslxConfig.site;

  return (
    <div className="text-muted-foreground">
      <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground mb-2">
        {config.name}
      </h1>
      {config.description && (
        <p className="text-sm text-muted-foreground/80 font-mono">
          {config.description}
        </p>
      )}
    </div>
  )
}