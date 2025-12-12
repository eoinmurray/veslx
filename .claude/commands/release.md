Bump version, commit, tag, and push to trigger CI publish.

Usage: /release [patch|minor|major]
Default: patch

Steps:
1. Run `npm version $ARGUMENTS` (defaults to patch if no argument)
2. Push commit and tags: `git push && git push --tags`
3. Report the new version and that CI will handle publishing
