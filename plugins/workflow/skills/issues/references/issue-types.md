# Native GitHub issue types

## MCP (primary)

Use MCP `issue_write` with the `type` parameter to create or update an issue type.

Use MCP `list_issue_types` to discover the available types before you set a value.

- Common org types: `Bug`, `Epic`, `Feature`, `Story`, `Task`

## Fallback (gh api)

When MCP is not available, use REST with the `type` field.

### Create an issue with a type

```bash
gh api repos/{owner}/{repo}/issues \
  -X POST \
  -f title="..." \
  -f body="..." \
  -f type="Feature" \
  --jq '.number'
```

### List available issue types (org level)

```bash
gh api graphql \
  -H "GraphQL-Features: issue_types" \
  -f query='query {
    organization(login: "navikt") {
      issueTypes {
        nodes {
          id
          name
        }
      }
    }
  }'
```