---
name: ecosystem-map
description: Use when the user wants an ecosystem map, knowledge graph, concept map or "map of everything around X" for a topic they are learning (a library, framework, field, language, tool stack, discipline), or wants to extend/update one of their existing maps. Researches the topic, writes the graph data into the ecosystem-maps repo, validates it, commits, pushes to GitHub and confirms the GitHub Pages deploy at ecosystem.lakshay.app.
---

# Ecosystem map

Build (or extend) one interactive force-directed knowledge graph in the user's
`ecosystem-maps` site, then ship it live. The user runs this for whatever they are
currently learning, so the finished product is a published map, not a draft.

**Repo:** `/home/lakshay/ecosystem-maps` — work there by absolute path, whatever
directory the session started in.
**Live site:** `https://ecosystem.lakshay.app/` (GitHub Pages, branch deploy from
`main` — pushing to `main` *is* deploying).

## The content spec lives in the repo

Read `/home/lakshay/ecosystem-maps/prompts/ecosystem-map-builder.md` in full before
writing anything. It is the authoritative spec for research, scoping, node/edge
content rules and the data-file format. This skill only adds the end-to-end
workflow around it; where they overlap, the prompt file wins. Also skim one
existing `data/*.js` map to match tone and density.

## Workflow

1. **Pin down the topic.** Take topic, boundaries, depth and audience from the
   user's request. If the topic is too broad or ambiguous to scope (the prompt's
   "just 'AI'" case), ask one question. Otherwise pick sensible defaults and state
   them — don't interrogate.
2. **New map or existing?** Check `data/manifest.js`. If a map already covers the
   topic, extend that file (add nodes/edges, refresh stale facts) instead of
   creating a near-duplicate; keep existing node `id`s stable — they are public
   deep links.
3. **Research** per section 1 of the prompt. Verify every URL you use; drop links
   you can't confirm. Parallel web searches per cluster are the efficient route.
4. **Scaffold** (new maps only):
   `node scripts/new-map.mjs <slug> "<Title> Ecosystem Map"` — slug is kebab-case.
5. **Write** `data/<slug>.js` per the prompt, and fill the manifest entry
   (`subtitle`, two-sentence `blurb` naming what's left out, `accent`, 3-4 `tags`).
   Set `root` to the hub node and give the map an accent distinct from the
   existing maps' accents.
6. **Validate:** `node scripts/validate.mjs`. Fix every error and orphan warning
   in the data, then re-run until clean. Never ship past a failure.
7. **Publish:**
   ```bash
   scripts/publish.sh <slug> "Add <Topic> ecosystem map" # or "Extend <Topic> map: …"
   ```
   Add a blank line and the session's commit attribution trailer to the message
   if one is configured. The script re-validates, stages only the map's three
   files, commits, rebases on `origin/main`, pushes and waits for the Pages build.
   If it refuses (wrong branch, unrelated staged files), report why — don't
   work around it with manual `git add -A` or force-pushes.
8. **Report** in a few lines: the live URL printed by the script, scope and
   boundary decisions, node/edge/cluster counts, and where the graph is densest
   or most interesting to start exploring. Don't restate the format spec.

## Guardrails

- Only touch `data/<slug>.js`, `maps/<slug>.html` and `data/manifest.js`. The
  shell (`assets/`), templates and other maps are off-limits unless the user asks.
- Non-software topics are fine (a science, a period of history, a craft). Map
  link types onto what fits: `Guide` for articles/encyclopedia entries/courses,
  `Paper` for papers and books, `Tool` for simulators or calculators, `Video` via
  `yt()`. The renderer only knows those six types.
- If `git push` fails (auth, network, diverged history the rebase couldn't
  resolve), stop and tell the user; the commit is safe locally.
