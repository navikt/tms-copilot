# Issue dependencies

## MCP (primary)

Use MCP for dependencies when it is available in the active toolset.

- First check whether the MCP setup exposes dependency operations
- Prefer MCP over direct API calls

## Fallback (gh api)

When MCP is not available, use the GitHub REST API through `gh api`.

### Add a dependency

```bash
# Issue N depends on another issue
gh api \
  repos/{owner}/{repo}/issues/{issue_number}/sub_issues/dependencies \
  -X POST \
  -f dependent_issue_id=N

# Alternative payload form
gh api \
  repos/{owner}/{repo}/issues/{issue_number}/sub_issues/dependencies \
  -X POST \
  -f dependency_issue_id=N
```

### List dependencies

```bash
gh api repos/{owner}/{repo}/issues/{issue_number}/sub_issues/dependencies
```

### Remove a dependency

```bash
gh api repos/{owner}/{repo}/issues/{issue_number}/sub_issues/dependencies/{dependency_id} -X DELETE
```

### Semantics

- **blocked-by**: which issues block this issue
- **blocking**: which issues this issue blocks

### Note

This replaces the text-based `Avhenger av #NNN` as the data source, but keep the text in the issue body for readability.