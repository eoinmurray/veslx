

export default async function importConfig(root: string) {
  const file = Bun.file(`${root}/veslx.config.ts`);

  if (!await file.exists()) {
    return
  }
  
  const module = await import(`file://${root}/veslx.config.ts`);
  const config = module.default;
  return config
}