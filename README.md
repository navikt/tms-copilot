# Copilot customizations for team min-side

[![CI](https://github.com/navikt/tms-copilot/actions/workflows/tms-copilot-sync.yml/badge.svg)](https://github.com/navikt/tms-copilot/actions/workflows/tms-copilot-sync.yml)
![Markdown](https://img.shields.io/badge/docs-Markdown-informational?logo=markdown)
![GitHub Actions](https://img.shields.io/badge/automation-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)

Dette repoet samler gjenbrukbare Copilot customizations som team min-side kan bruke direkte, og dele videre til andre repoer ved behov.

## Formål

Repoet er et dokumentasjons- og innholdsrepo for Copilot-tilpasninger. Målgruppen er utviklere som vedlikeholder agentinstruksjoner, og som trenger:

- tydelige skills for konkrete arbeidsflyter
- en enkel måte å oppdatere skills og instructions på tvers av repoer
- et felles sted for å videreutvikle instruksjonene

## Skills i repoet

Alle skills ligger under `.github/skills/`, med egen `SKILL.md` per skill.

- `commit`: commit-meldinger etter Conventional Commits, tilpasset Nav-scopes
- `grill-me`: strukturert intervju for å stressteste planer
- `issues`: håndtering av GitHub Issues — maler, epics, sub-issues, dependencies og prosjektboard
- `pull-request`: oppretting og oppdatering av pull requests med semantisk tittel og issue-kobling
- `readme`: oppdatering av README/repo-dokumentasjon
- `write-a-skill`: opprette nye skills med riktig struktur

## Instructions i repoet

Repoet inneholder også delte instruction-filer under `.github/instructions/` som kan brukes av agenter i kompatible kodebaser.

- `astro-aksel.instructions.md`: retningslinjer for Astro/Aksel-filer
- `astro-aksel.metadata.json`: metadata for instruction-regelen

## Sync av customizations

Det finnes to måter å hente skills og instructions fra dette repoet inn i et teamrepo.

### Alternativ A: nav-pilot (anbefalt)

Nav sitt org-verktøy [nav-pilot](https://github.com/navikt/copilot) kan synce direkte fra
dette repoet via den gjenbrukbare workflowen `copilot-customization-sync.yml`. Den
auto-detekterer alle `.github/skills/*/` og `.github/instructions/*.instructions.md`
som finnes i kilderepoet, og oppretter PR i målrepoet når noe har endret seg.

Legg til `.github/workflows/copilot-sync.yml` i teamrepoet (ferdig eksempel ligger i
[`examples/copilot-sync.yml`](examples/copilot-sync.yml)):

```yaml
name: Copilot Customization Sync

on:
  schedule:
    - cron: '0 7 * * 1'
  workflow_dispatch:

jobs:
  sync:
    uses: navikt/copilot/.github/workflows/copilot-customization-sync.yml@main
    with:
      source_repo: navikt/tms-copilot
    permissions:
      contents: write
      pull-requests: write
```

#### nav-pilot CLI-kommandoer

Lokalt kan du bruke nav-pilot direkte mot dette repoet. Bruk **samme kilde
(`--source navikt/tms-copilot`) for både install og sync** — ellers feiler sync (se
[navikt/copilot#260](https://github.com/navikt/copilot/issues/260)).

```bash
# Installer en enkelt skill fra dette repoet
nav-pilot install issues --source navikt/tms-copilot

# Installer alle manglende customizations fra kilden
nav-pilot install --all --source navikt/tms-copilot

# Sjekk om noe har endret seg i kilden (åpner ingenting, viser bare status)
nav-pilot sync --source navikt/tms-copilot

# Bruk oppdateringene direkte i arbeidskopien
nav-pilot sync --source navikt/tms-copilot --apply

# Maskinlesbar status (nyttig i CI/skript)
nav-pilot sync --source navikt/tms-copilot --json

# Personlig (user-scope) installasjon i ~/.copilot/
nav-pilot install --user --all --source navikt/tms-copilot

# Se hva som er installert og om det er oppdatert
nav-pilot list --installed
```

> `nav-pilot sync` (uten `--source`) synker mot standardkilden `navikt/copilot`. Angi
> alltid `--source navikt/tms-copilot` når du jobber med dette repoets customizations.

Sync er kilde-avgrenset: kun filnavn som faktisk finnes i `navikt/tms-copilot`
sammenlignes. nav-pilot sine øvrige ~30 skills blir **ikke** dratt inn. Eneste
navnekollisjon i dag er `commit`, som finnes i begge kilder — hvis et repo
syncer fra begge, beskytt din versjon med `.github/copilot-sync.json`:

```json
{
  "overrides": [".github/skills/commit/"]
}
```

### Alternativ B: repoets egen workflow

Repoet inneholder også en selvstendig reusable workflow som kopierer `.github/skills/**`
og `.github/instructions/**` til teamrepoer:

```yaml
name: Customizations Sync

on:
  schedule:
    - cron: '0 7 * * 1'
  workflow_dispatch:

jobs:
  sync:
    uses: navikt/tms-copilot/.github/workflows/tms-copilot-sync.yml@main
    with:
      customizations: "readme, astro-aksel.instructions"
    permissions:
      contents: write
      pull-requests: write
```

Workflowen kopierer valgte skills/instructions, oppretter PR bare når noe faktisk er endret, og lar øvrige lokale mapper i målrepoet ligge urørt. Inputen er kommaseparert og bruker kun skill-navn eller instruction-navn uten `.md`. Hvis `customizations` utelates, legges alle manglende skills/instructions fra kilderepoet til i målrepoet.

## Utvikling

Dette repoet publiserer ikke en egen app med lokal URL. For oppdatert oversikt over automatisering og tilgjengelige workflows, bruk `gh workflow list` eller se `.github/workflows/`.

## For Nav-ansatte

Kontakt teamet i [#team-minside på Slack](https://nav-it.slack.com/app_redirect?channel=team-minside).