---
name: issues
description: "Creates and manages GitHub issues: issue templates, epics, sub-issues, dependencies, project board, status, completion comments and PR links. Use when the user asks to create, break down, update or close an issue or epic, to pick the next issue to work on, or invokes /issues."
---

# Issue management

Create and manage GitHub Issues with epics, sub-issues and dependencies.

Write issue titles, issue text and comments in the language the repo's recent history uses. The completion comment template in step 7 and the `Avhenger av #NNN` and `Del av epic: #EPIC_NUMMER` lines are Norwegian examples of that output.

## Workflow

### 1. Check whether the issue already exists

Before you create a new issue, check whether the user has already referred to one (for example `#123` or a GitHub URL). If so, use the existing issue.

### 2. Choose a type

| Type | Use |
|------|-----|
| **Epic** | Large tasks that are broken down into several issues |
| **Feature** | New functionality |
| **Story** | User story / use case |
| **Task** | Technical task, maintenance, chore |
| **Bug** | Defect that must be fixed |

### 3. Create the issue with the right structure

The repo has issue templates in `.github/ISSUE_TEMPLATE/` for the relevant types (`feature`, `bug`, `story`, `task`, `epic`). Read the field structure from the template for the chosen type and write markdown text with matching sections.

Always include:
- **Dependencies** (optional): `Avhenger av #NNN` if relevant
- **Epic link** (optional): `Del av epic: #EPIC_NUMMER` if relevant

### 4. Create the issue

**MCP (preferred):** Use the issue/project tools to create the issue with the right type directly.

**Fallback (`gh api`):**
```bash
gh api repos/navikt/REPO_NAVN/issues \
  -X POST \
  -f title="Kort, beskrivende tittel" \
  -f body="BODY" \
  -f type="Feature" \
  --jq '.html_url'
```

See `references/issue-types.md` for details on issue types.

### 4b. Add the issue to a project board (if configured)

After programmatic creation: read the issue template in the target repo and look for the `projects:` line.

- If the repo's issue template has no `projects:` line, skip this step without failing
- If a project is configured, add the issue to the board and discover the project, fields and options dynamically
- Do not hardcode field IDs, option IDs or status names per repo

See `references/projects.md` for the workflow and error handling.

### 5. Epic handling

For large tasks that are broken down:

1. Create the epic issue first
2. Create the underlying issues
3. Link the sub-issues to the epic through GitHub's sub-issues API
4. Link dependencies through the dependencies API
5. Also include `Del av epic: #EPIC_NUMMER` and `Avhenger av #NNN` in the issue text for readability

#### Sub-issues must be self-contained

Each sub-issue must contain enough context for someone to pick it up without reading the whole epic:
- A clear description of what to do
- Relevant files and APIs
- Dependencies on other issues
- Acceptance criteria

### 6. Epic workflow and progress

When an epic is to be resolved step by step:

1. **Read the epic** — fetch the epic, its sub-issues and the dependency information
2. **Categorize the open sub-issues**:
    - **Runnable now** — all dependencies are met
    - **Blocked** — at least one dependency is still open
    - **Parallel candidates** — several runnable tasks with no dependencies between them
3. **Present a recommendation**:
    - If there is one candidate → suggest it
    - If there are several candidates → suggest selectable or parallel alternatives
    - If there are no candidates → explain what blocks further work
4. **Solve the task** — follow the normal workflow for the chosen issue
    - When work starts, update the project status to `In Progress`/equivalent using the pattern in `references/projects.md`
    - If the repo, project or status field is not configured, skip without failing
5. **Repeat** — after completion, consider the next runnable task

### 7. Completion comment on issues

After an issue is resolved, leave a completion comment:

```bash
gh issue comment ISSUE_NUMMER --repo navikt/REPO --body "COMMENT_BODY"
```

The completion comment must be structured and concise:

~~~markdown
## ✅ Løst

**Oppsummering:** [Kort beskrivelse av hva som ble gjort]

**Endrede filer:**
- `src/path/to/file1.ts` — [hva som ble endret]
- `src/path/to/file2.ts` — [hva som ble endret]

**Verifisering:** [build/typecheck/test/lint eller `Ikke kjørt` + grunn]

**Inspeksjon:** [Godkjent / Godkjent med merknader / Må følges opp] — [kort oppsummering]

**PR:** #PR_NUMMER
~~~

Use a short inspection summary in the comment — not a full ASCII report unless the user explicitly asks for one.

### 8. Close the epic automatically

After a sub-issue is closed, check whether all sub-issues in the epic are complete.

If no open sub-issues remain:
1. Leave a summarizing comment on the epic
2. Close the epic

### 9. Issue link in PRs

When the work results in a PR:

```bash
Closes #ISSUE_NUMMER
```

Or, if the issue should stay open:

```bash
Relates to #ISSUE_NUMMER
```

## Decision tree

```
Is the task large enough for an epic?
├── Yes → Create an Epic + underlying issues
│   └── Each sub-issue: self-contained, with dependencies and acceptance criteria
└── No → Create a standalone issue
    └── Type? → Feature / Story / Task / Bug
```
