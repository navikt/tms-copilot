# Native GitHub sub-issues

## MCP (primary)

Use MCP `sub_issue_write` first to create, list, remove and reprioritize sub-issues.

- `sub_issue_write` is enabled by default in the issues toolset

## Fallback (gh api)

When MCP is not available, use the GitHub REST API through `gh api`.

### Add a sub-issue

```bash
gh api \
  repos/{owner}/{repo}/issues/{issue_number}/sub_issues \
  -X POST \
  -f sub_issue_id=NUMBER
```

> `sub_issue_id` is the issue number (integer), not the node ID.

### List sub-issues

```bash
gh api repos/{owner}/{repo}/issues/{issue_number}/sub_issues
```

### Remove a sub-issue

```bash
gh api repos/{owner}/{repo}/issues/{issue_number}/sub_issues/{sub_issue_id} -X DELETE
```

### Reprioritize the order

```bash
gh api \
  repos/{owner}/{repo}/issues/{issue_number}/sub_issues \
  -X PATCH \
  -f sub_issue_id=N \
  -f after_id=M
```

### Note

This replaces the text-based `Del av epic: #NNN` as the data source, but keep the text in the issue body for readability.