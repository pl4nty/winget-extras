# Manifest linter

The linter has three layers:

- `linter.ts` loads manifests, runs the schema validators, composes rules, and applies fixes.
- `rules/` contains repository policy. Every rule implements the same small `Rule` interface.
- `cli.ts` and `reporter.ts` handle command-line arguments and terminal output.
- `generate-manifest-types.ts` builds the generated TypeScript declarations and schema validators.

Valid manifests use Bun's native YAML parser. Inputs with duplicate keys or complex
mapping syntax fall back to the full YAML parser, which preserves strict parsing and
detailed error ranges without imposing its cost on the normal path.

When `GITHUB_ACTIONS=true`, the reporter emits GitHub error and warning annotations in
addition to its normal terminal code frames.

## Adding a rule

1. Add one file under the appropriate `rules/file`, `rules/installer`, or
   `rules/repository` directory.
2. Add its adjacent `*.test.ts` file.
3. Register the rule in `rules/index.ts`.

A repository rule can use the generic interface directly:

```ts
export const exampleRule = defineRule({
	id: 'repository/example',
	check({ records, report }) {
		for (const record of records) {
			if (/* policy violation */) {
				report({ file: record.file, message: 'explain the violation' });
			}
		}
	},
});
```

Installer rules can use `defineInstallerRule`. It selects installer manifests,
resolves inherited root-level installer fields, and attributes reported issues to
the correct file automatically.

`lintManifests({ rules: [...] })` accepts any rule list, so rules can also be
composed independently for tests or other callers.

## Upstream versions

`repository/upstream-versions` warns when a package version is already published in
[microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs), because this source
exists for packages upstream does not carry. Each version is probed through the
jsDelivr mirror the merge workflow already uses, so no token or clone is needed.

The check is the only rule that reaches the network, and it never turns an unanswered
lookup into a diagnostic: unreachable upstream means no warning, and probing stops
after a few failures so offline runs stay fast. `createUpstreamVersionsRule(lookup)`
takes the lookup as an argument for tests and other callers.
