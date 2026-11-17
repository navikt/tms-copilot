---
name: commit
description: "Writes commit messages in the Conventional Commits format, with scopes, a breaking-change footer and a short summary line. Use when the user wants to commit staged changes, asks for a commit message, or invokes /commit."
---

# Conventional commit

Generate commit messages that follow the Conventional Commits specification, adapted to Nav projects.

The commit messages in the examples below are in Norwegian. Write your own commit messages in the language the repo's recent history uses.

## Format

```
<type>[(<scope>)]: <short description>

[optional body]

[optional footer]
```

## Types

| Type | Use when |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, semicolons and similar (no code change) |
| `refactor` | Code that neither fixes a bug nor adds a feature |
| `perf` | Performance changes |
| `test` | Adding or fixing tests |
| `build` | Changes to the build system or dependencies |
| `ci` | Changes to CI configuration |
| `chore` | Other changes that do not affect code |

## Nav scopes

Use the scope list below only when the repo has a `src/features/` directory. In any other repo, use no scope, or follow the scope convention the repo's own `git log` shows.

Scopes follow the vertical slices under `src/features/*` (for example `utbetaling`, `innboks`, `dokumenter`, `din-oversikt`, `personalia`, `aktuelt`, `alert-island`, `innloggede-tjenester`) and shared infrastructure (`auth`/`middleware`, `microfrontend`, `layout`, `mock`, `deps`, `nais`).

```
feat(utbetaling): støtt opptil 4 utbetalinger i widget
fix(auth): fiks token-validering for TokenX i middleware
docs(readme): oppdater lokal kjøring med pnpm
refactor(locale): introduser getLocale-hjelper for currentLocale
test(innboks): legg til test for InnboksFallback
build(deps): oppgrader Astro til 7.0.9
ci(deploy): legg til prod-deploy steg
perf(microfrontend): unngå dobbelt fetch ved fallback
chore(nais): oppdater ressursgrenser
```

## Breaking changes

```
feat(microfrontend)!: endre audience-format for OBO-exchange

BREAKING CHANGE: getAudience returnerer nå `cluster:namespace:app`.
Kallende features må oppdatere sin bruk.
```

## Rules

- First line: at most 72 characters
- Use the imperative: "add", not "added" or "adds"
- Do not end with a period
- Write the message in the language the repo's recent history uses, and use that language consistently
- Reference a GitHub issue in the footer: `Closes #123`
- Always include the `Co-authored-by` trailer for Copilot

## Workflow

### 1. Analyze staged changes

```bash
git diff --cached --stat        # Overview of changed files
git diff --cached               # Detailed diff
```

### 2. Find the type and scope

Based on the diff:
1. Identify the **type** (feat/fix/refactor/etc.)
2. Identify the **scope** (which module or domain area), following the Nav scopes section above
3. Write a short, precise description

### 3. Write the commit message

```bash
git commit -m "type(scope): short description" \
  -m "Longer explanation if needed." \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### 4. Several logical changes

If the staged changes contain several logical changes:
1. Suggest splitting them into separate commits
2. Use `git add -p` to stage parts of the changes
3. Make one commit per logical change

## Security protocol

Before you commit, verify that the staged changes do **not** contain:
- Tokens, API keys or credentials
- Passwords or secrets (also in comments)
- PII (national identity numbers, email addresses, names in test data)
- `.env` files with sensitive values

If you find sensitive data, **stop** and notify the user.

## Examples

```bash
# Simple feature
git commit -m "feat(personalia): vis navn fra dekoratør-data" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Bug fix with reference
git commit -m "fix(auth): håndter manglende token i middleware" \
  -m "Ugyldig token førte til at brukere ikke ble redirectet til
login, men fikk en tom side." \
  -m "Fixes #456

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Dependency update
git commit -m "build(deps): oppgrader Astro til 7.0.9" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Breaking change
git commit -m "feat(microfrontend)!: fjern deprecated fallback-url" \
  -m "BREAKING CHANGE: local-fallback-url er fjernet. Bruk env-schema i astro.config.mjs.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
