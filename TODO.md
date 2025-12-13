
I as a developer should be able to:
  - develop locally with `bun run dev` with hmr.
  - release this package on npm with github actions.
  - run it with `bunx veslx`
  - run `bunx veslx init` to init a veslx project which sets a content dir
  - run `bunx veslx serve` and serve on :3000 a local site pointing at the content dir
  - run `bunx veslx init` build a static site to dist
  - have posts and slides
  - have posts and slides print nicely with the browser print pdf function
  - set a content width tailwind variable that the content obeys except for Galleries who can 
  take up more width
  - have a beautiful gallery
  - use imports in mdx files
  - use npm imports in mdx files and veslx still build

Tests:
  - that `veslx serve` works
  - that `veslx build` works
