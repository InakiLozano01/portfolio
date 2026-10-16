# Temporary braces security patch

`braces+3.0.3.patch` backports the library changes from
[upstream PR #72](https://github.com/micromatch/braces/pull/72), through commit
`28d440b5dd449dbf1fe6f3506cf94ecca4d02660`, for
[CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
It caps brace/parenthesis nesting and recursive AST traversal at 100 and rejects
cyclic AST parent chains. The cap also applies when callers request a higher limit.

There is no published fixed release as of 2026-10-16. The package keeps its real
upstream version, so npm audit still reports this advisory and dependent packages.
These are locally patched findings, not an audit clean bill of health.

`npm ci` applies the patch through `postinstall`; an application failure aborts
installation. Do not use `--ignore-scripts` for release dependencies. Docker copies
the patch before installing. Run `npm run test:security` after dependency updates.
Replace the patch with an upstream fixed release when available and rerun the
regression tests before removing it.

The `postcss-selector-parser` override selects the patched 7.x parser for the
Tailwind 3 and typography consumers; the production CSS build checks compatibility.
The scoped `@istanbuljs/load-nyc-config` override selects js-yaml 4, whose `load`
API the loader already uses, removing the old argparse/sprintf-js dependency chain.
