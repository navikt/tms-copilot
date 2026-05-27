# tms-copilot

En collection av skills for AI-kodingsagenter. Skills er pakkede instruksjoner og skript som utvider agentenes evner.

Skills følger [Agent Skills](https://agentskills.io/home) formatet.

## Eksempel

Hver skill ligger i sin egen mappe med en `SKILL.md`-fil som minimum. Du kan i tillegg legge ved skript, referanser og ressurser som agenten kan bruke når skillen aktiveres.

```text
skills/
├── code-review/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── check.sh
│   └── references/
│       └── checklist.md
├── changelog/
│   ├── SKILL.md
│   └── assets/
│       └── template.md
└── release-notes/
    ├── SKILL.md
    └── references/
        └── process.md
```

## Hva en skill typisk inneholder

- `SKILL.md` med navn, beskrivelse og instruksjoner
- `scripts/` for kjørbar logikk
- `references/` for dokumentasjon og støtteinnhold
- `assets/` for maler og andre ressurser

## Sync av skills til andre repoer

Repoet inneholder en reusable workflow for å kopiere `.github/skills/**` til teamrepoer:

```yaml
name: Skills Sync

on:
  schedule:
    - cron: '0 7 * * 1'
  workflow_dispatch:

jobs:
  sync:
    uses: navikt/tms-agent-skills/.github/workflows/tms-copilot-sync.yml@main
    permissions:
      contents: write
      pull-requests: write
```

Workflowen lager PR bare når skills har endret seg, kopierer kun skill-mappene, og beholder eventuelle ekstra lokale skills i målrepoet.