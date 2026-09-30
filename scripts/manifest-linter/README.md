# Manifest linter

The linter has three layers:

- `linter.ts` loads manifests, runs the schema validators, composes rules, and applies fixes.
- `rules/` contains repository policy. Every rule implements the same small `Rule` interface.
- `cli.ts` and `reporter.ts` handle command-line arguments and terminal output.
- `manifest-schemas.ts` contains the Zod schemas, their inferred TypeScript types, and the
  natively compiled validators.

When `GITHUB_ACTIONS=true`, the reporter emits GitHub error and warning annotations in
addition to its normal terminal code frames.

## Configuration

`config.json` contains repository exceptions. Each key under `ignore` is a
rule ID, and each value maps repository-relative glob patterns to an optional reason. Matching
diagnostics are omitted, including any associated fix.

```json
{
	"ignore": {
		"repository/example": {
			"manifests/a/Acme/App/**": "ignore reason"
		}
	}
}
```

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
