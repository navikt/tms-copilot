---
name: pull-request
description: "Creates and updates pull requests with a semantic title, a short description, issue links, test status, risk notes, a checklist and reviewer context. Use when the user asks to open, create or update a PR, or invokes /pull-request."
---

# Pull request

Create consistent, well-structured pull requests that link to issues and follow the team's workflow.

Write the PR title and text in the language the repo's recent history uses. The `Del av epic: #100` line in the table below is a Norwegian example.

## PR title

Use the semantic commit format:

```
type(scope): short description
type: short description
```

- **Types:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `build`, `ci`, `perf`
- **Scope:** Optional. Follow the scope rule in the commit skill, and leave the scope out when that rule says to.

## PR body

When the repo has `.github/PULL_REQUEST_TEMPLATE.md`, read it and fill in its sections. When the repo has no template, write a short body that summarizes the points in the list below.

For non-trivial changes the text should briefly summarize:
- what changed
- the issue link
- what was verified (build/typecheck/test/lint)
- any notes from review/inspection

## Issue links

| Situation | In the PR body |
|-----------|----------------|
| Issue fully resolved | `Closes #123` |
| Partial work, issue still open | `Relates to #123` |
| Part of an epic | `Closes #123` + `Del av epic: #100` |
| No issue | Write the motivation directly in the description |

## Creating the PR

### MCP (preferred)

Use the available PR tool to create the PR with a title and text.

### Fallback (gh CLI)

```bash
gh pr create \
  --repo navikt/REPO_NAVN \
  --title "type(scope): description" \
  --body "BODY"
```

### Auto-merge (squash)

After creation:
```bash
gh pr merge --auto --squash
```
