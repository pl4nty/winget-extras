# Working in this repo

## Pull requests

Write the body at the size of the change. Most PRs here are one sentence — what
changed and why. A CI tweak or a manifest update does not need sections.

Never include: headed sections on a small diff, a table restating two facts, a
"Verification" or "Testing" section describing commands you ran, a "Hardening"
or "Why" essay, marketing adjectives, or a restatement of the diff.

Do include, in prose, only if it is genuinely true and not obvious from the
diff: a setup step someone must perform before the change works, or a decision a
reviewer would otherwise have to reconstruct. One or two sentences.

Reserve structure for PRs that earn it — a real migration, a design with
rejected alternatives. If you are reaching for a heading on a two-file diff, you
are padding.

The same applies to PR comments and commit message bodies.
