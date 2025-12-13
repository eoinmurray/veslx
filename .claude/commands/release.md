Bump version, commit, tag, and push to trigger CI publish.

Usage: /release [patch|minor|major]
Default: patch

Steps:
1. Run `npm version $ARGUMENTS` (defaults to patch if no argument)
2. Push commit and tags: `git push && git push --tags`
3. Monitor the GitHub Action with `gh run list --limit 1` and `gh run watch` if still in progress
4. Report success or failure - if failed, show logs with `gh run view --log-failed`
