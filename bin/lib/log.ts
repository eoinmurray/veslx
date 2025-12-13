// Minimal CLI logger with subtle styling

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

export const log = {
  info: (msg: string) => console.log(dim(`  ${msg}`)),
  success: (msg: string) => console.log(`  ${green('✓')} ${msg}`),
  error: (msg: string) => console.error(`  ${red('✗')} ${msg}`),
  url: (url: string) => console.log(`  ${cyan(url)}`),
  blank: () => console.log(),
};

export const banner = () => {
  console.log(dim(`  veslx`));
};
