# Copilot customizations for team min-side

Dette repoet er en plugin marketplace for GitHub Copilot CLI. Marketplacen heter `min-side` og har tre plugins:

- `frontend`
  - `astro`: skrive og gjennomgå kode i teamets Astro-apper etter Astro 7- og Aksel-dokumentasjonen
- `workflow`
  - `commit`: commit-meldinger etter Conventional Commits, med scopes
  - `pull-request`: opprette og oppdatere pull requests med semantisk tittel og issue-lenker
  - `issues`: opprette og følge opp GitHub issues, epics og prosjektboard
- `backend`: tom foreløpig, plass til backend-skills

## Ta i bruk i et repo

Legg denne filen i repoet som `.github/copilot/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "min-side": {
      "source": {
        "source": "github",
        "repo": "navikt/tms-copilot"
      }
    }
  },
  "enabledPlugins": {
    "frontend@min-side": true,
    "workflow@min-side": true
  }
}
```

Mappen må være trusted i Copilot CLI. Første session installerer pluginene i bakgrunnen. De lastes fra og med andre session.

## Endre en skill

1. Rediger `plugins/<navn>/skills/<skill>/SKILL.md`.
2. Øk `version` i `plugins/<navn>/.github/plugin/plugin.json`. CI feiler hvis en plugin er endret uten ny versjon.
3. Åpne en pull request. Workflowen `.github/workflows/validate.yml` kjører `scripts/validate-plugins.mjs` og `scripts/check-version-bump.mjs`.

Kjør testene lokalt med `node --test`.

## Sjekk av AGENTS.md

`scripts/check-agents-commands.mjs` leser `AGENTS.md` i et repo og sjekker at hver `pnpm run`- eller `npm run`-kommando der finnes som script i `package.json`. En pull request som viser til et script som mangler, får en rød sjekk.

Skriv kommandoene som `pnpm run <script>` i AGENTS.md. Sjekken ser bare `pnpm run` og `npm run`, så `pnpm test` og `pnpm verify` blir ikke sjekket.

Legg denne workflowen i teamrepoet som `.github/workflows/agents-md.yaml`:

```yaml
name: AGENTS.md
on: pull_request
jobs:
  agents-md:
    uses: navikt/tms-copilot/.github/workflows/agents-md-check.yml@main
```

## For Nav-ansatte

Kontakt teamet i [#team-minside på Slack](https://nav-it.slack.com/app_redirect?channel=team-minside).
