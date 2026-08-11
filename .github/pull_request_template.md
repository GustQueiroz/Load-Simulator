## What changes

<!-- One or two sentences. If it changes simulation numbers, say which. -->

## Why

<!-- Which System Design lesson does this make clearer? -->

## Checklist

- [ ] `npm run verify` passes (typecheck, lint, architecture, tests, build)
- [ ] Engine changes come with tests — the simulation runs without a browser, so there is no excuse not to
- [ ] Layer fences still hold — do not import React into `application/` / `domain/`
- [ ] Simplifications and pedagogical approximations are explained in a comment, so the next contributor does not "fix" them
- [ ] New UI strings exist in **both** `src/i18n/messages/pt-BR.ts` and `en.ts`
- [ ] `docs/simulation-model.md` updated if a rule of the model changed
