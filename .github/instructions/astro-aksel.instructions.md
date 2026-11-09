---
applyTo: "src/**/*.{astro,tsx,ts,css}"
---

# Astro med Aksel

Load the `astro` skill (`.github/skills/astro/SKILL.md`) before you write or review code in this app. It holds the rules from the Astro 7 and Aksel docs and the team's conventions. Your training data on Astro and Aksel is out of date, so trust the skill over memory.

If you can't load the skill, these are the rules agents break most often:

- Astro 7 drops whitespace that is only a line break between tags, or between text and a tag (`compressHTML: "jsx"`); a space on the same line is kept. Write `{" "}` where a space must survive a line break. https://docs.astro.build/en/guides/upgrade-to/v7/#new-default-whitespace-handling-compresshtml-jsx
- Inside a `server:defer` component, `Astro.url` is `/_server-islands/<Name>`. Pass `language` and other page data in as props. https://docs.astro.build/en/guides/server-islands/#accessing-the-page-url-in-a-server-island
- With `output: "server"`, on-demand dynamic routes read `Astro.params`, never `getStaticPaths` (only routes you prerender use it). https://docs.astro.build/en/guides/routing/#on-demand-dynamic-routes
- Static parts get no `client:*` directive. Visible interactive islands use `client:visible` or `client:load`; `client:only="react"` is only for islands with no server HTML worth showing. Props to islands must be serializable: objects are fine, functions are not. https://docs.astro.build/en/reference/directives-reference/#client-directives · https://docs.astro.build/en/guides/framework-components/#passing-props-to-framework-components
- Middleware imports from `astro:middleware`, and new env values go in the `astro:env` schema. https://docs.astro.build/en/guides/environment-variables/#type-safe-environment-variables
- Layout uses Aksel primitives (`HStack`, `VStack`, `HGrid`, `Box`) with `space-*` tokens. Aksel's docs index is at https://aksel.nav.no/llm.md
- No code comments.
