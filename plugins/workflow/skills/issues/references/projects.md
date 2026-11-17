# GitHub Projects V2

## When is this needed?

The web UI can automatically attach an issue to a project through `projects:` in the issue template. Programmatic creation (MCP, REST, `gh api`) does not do that automatically. Run the project step after the issue is created.

## Runtime discovery of the project

1. Read the relevant issue template in the target repo: `.github/ISSUE_TEMPLATE/<type>.yml`
2. Find the `projects:` line in the format `["owner/number"]` (for example `["navikt/157"]` → `owner=navikt`, `number=157`)
3. Parse `owner` and the project number from this line
4. If the line is missing: the repo's issue template has no `projects:` line → skip the whole project flow without failing

Use the template in the consumer repo, not the hovmester source. Sync may have stripped `projects:` out entirely.

## Minimum sequence for project attachment

0. **Auth preflight before project calls**  
   Run `gh auth status` and look for the `project` scope in the list before you use `gh project ...`.
    - If the `project` scope is missing: stop before the first `gh project` call and present this message verbatim:
      "For å oppdatere prosjektboardet trenger jeg `project`-scope på din `gh`-token. Kjør:

      ```
      gh auth refresh -s project
      ```

      Deretter kan jeg fortsette. Vil du heller hoppe over prosjekttilknytning for nå?"
    - If the user chooses to skip: skip the project step silently and continue the rest of the issue flow
1. **Find the project ID**  
   Use `gh project list --owner OWNER --format json` and find the project whose `number` matches the project number from the template. Store both the project number and the project ID.
2. **Add the issue to the project**  
   Use `gh project item-add NUMBER --owner OWNER --url ISSUE_URL --format json` and store the returned item ID.
3. **Discover fields dynamically**  
   Use `gh project field-list NUMBER --owner OWNER --format json`. Find fields such as `Status` and possibly `Type` by name, and read the options from the response. Fields and option IDs are project-specific — never hardcode values.
4. **Set the initial field values**  
   Use `gh project item-edit` with the item ID, project ID, discovered field ID and option ID for single-select fields.
    - **Status**: prefer `Todo`, otherwise `Backlog`, otherwise skip
    - **Type**: set only if the project actually has such a field and an option that matches the issue type

If a field does not exist on the board, skip only that field — not the whole creation.

## Status transition when work starts

When the user picks an issue and asks to start work:

0. Run the same auth preflight as above before the first `gh project` call. If the user chooses to skip, skip the project step silently and continue the rest of the flow.
1. Run the same runtime discovery of the `projects:` line
2. Find the existing item through `gh project item-list NUMBER --owner OWNER --format json` and match on the issue URL. Note that `item-list` returns at most 30 items by default; use `--limit 100` for large projects (or paginate if necessary).
3. If the issue is not already in the project, run `item-add` first
4. Fetch the field metadata again through `field-list`
5. Update `Status` by matching against known synonyms first: `In Progress`, `Doing`, `Påbegynt`, `I arbeid`, `Under arbeid`. If nothing matches, choose the closest active / non-`Done` option in the field.

Do not assume all boards use the same status names. Match against the options available in the specific project.

## Error handling

- Missing `projects:` line → skip the whole project step silently
- Project not found through `gh project list` → report briefly and continue; the issue is already created
- Auth/permission error in `gh project` → report briefly and continue; do not roll back the issue
- Field or option not found → skip only that field
- `gh issue close` or a PR with `Closes #...` will in most Projects V2 setups move the issue to `Done` automatically; do not build your own Done logic unless the board requires it. This assumes the project's built-in `Item closed` workflow is enabled (on by default in new projects, but it may have been disabled manually under Settings → Workflows).