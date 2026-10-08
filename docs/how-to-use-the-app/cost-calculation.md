# Cost calculation

One alert threshold applies to **total dollars** across all tools. How each tool's dollars are arrived at differs, and the
dashboard says which:

| Tag        | Source             | How the dollars are obtained                                          |
|------------|--------------------|-----------------------------------------------------------------------|
| `est.`     | Claude Code        | tokens × your price table                                             |
| `reported` | Copilot CLI        | the cost Copilot itself records for each call                         |
| `est.`     | Copilot in VS Code | tokens × your price table (VS Code logs no cost and no cache usage)   |
| `entered`  | Manual spend       | exactly what you typed                                                |

## Token-priced sources (Claude Code, VS Code Chat)

Logs hold **token counts, not dollars**. BeAware estimates:

```
cost = Σ tokens × price per million      (per token type)
```

Token types: input · output · cache write 5m · cache write 1h · cache read.

### Default prices, Claude ($/MTok)

| Model          | In | Out | Cache 5m | Cache 1h | Cache read |
|----------------|----|-----|----------|----------|------------|
| Opus 5.5       | 4  | 20  | 5        | 8        | 0.2        |
| Sonnet 5.5 / 5 | 2  | 10  | 2.5      | 4        | 0.2        |
| Sonnet 4.6     | 3  | 15  | 3.75     | 6        | 0.3        |
| Haiku 4.5      | 1  | 5   | 1.25     | 2        | 0.1        |

### Copilot models

Copilot entries in `prices.json` are keyed `copilot/<model>` (for example `copilot/gpt-5.5`), so they can't clash with the
same model priced by another tool. Defaults come from GitHub's published per-model prices. VS Code logs only input and
output tokens, so the estimate ignores caching and can **over**-count.

- Dated ids (`…-20251001`) match their base model
- Unknown model → $0 + warning (the warning shows the full key, e.g. `copilot/new-model`)
- Edit prices in `~/.config/beaware/prices.json`

## Copilot CLI: reported cost

The CLI records a cost per call in nano-AIU. GitHub documents 1 AI credit = $0.01. The step from nano-AIU to credits
(1 AI credit = 1,000,000,000 nano-AIU) is **inferred from the recorded values, not documented**, so treat CLI dollars as
reported-and-probably-right rather than exact. If GitHub publishes a different factor, it's one constant:
`src/providers/copilot/aiu.ts`. Changing `prices.json` never changes CLI costs.
