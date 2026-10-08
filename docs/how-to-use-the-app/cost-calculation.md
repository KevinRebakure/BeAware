# Cost calculation

Claude Code logs hold **token counts, not dollars**. BeAware estimates:

```
cost = Σ tokens × price per million      (per token type)
```

Token types: input · output · cache write 5m · cache write 1h · cache read.

## Default prices ($/MTok)

| Model          | In | Out | Cache 5m | Cache 1h | Cache read |
|----------------|----|-----|----------|----------|------------|
| Opus 5.5       | 4  | 20  | 5        | 8        | 0.2        |
| Sonnet 5.5 / 5 | 2  | 10  | 2.5      | 4        | 0.2        |
| Sonnet 4.6     | 3  | 15  | 3.75     | 6        | 0.3        |
| Haiku 4.5      | 1  | 5   | 1.25     | 2        | 0.1        |

- Dated ids (`…-20251001`) match their base model
- Unknown model → $0 + warning
- Totals are labeled **est.**
- Edit prices in `~/.config/beaware/prices.json`
