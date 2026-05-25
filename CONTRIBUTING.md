# Contributing to Concilium

Thanks for taking an interest. Concilium is a research-grade PoC, so the bar
for contribution is "does this make the orchestration patterns clearer or more
correct" rather than "does this add features." Both are welcome — just expect
discussion on scope before large changes.

## Getting set up

See the [README quick start](README.md#quick-start). The short version:

```bash
sdk install java 21-tem
brew install --cask docker
corepack enable && corepack prepare pnpm@latest --activate

# Option A — use DeepSeek (requires API key, ~$0/session)
export DEEPSEEK_API_KEY=sk-...

# Option B — fully offline, no API key needed
brew install ollama && ollama pull llama3.1:8b
export SPRING_PROFILES_ACTIVE=ollama

make up
```

## Running the checks

```bash
# Backend (requires Docker for Testcontainers)
cd concilium-api && ./mvnw test

# Frontend
cd concilium-web && npm run lint && npm run build
```

Backend tests use Testcontainers + PostgreSQL — Docker Desktop / Colima must
be running, otherwise the Spring context fails to load.

## Pull requests

- One feature or fix per PR. Small PRs get reviewed faster.
- Write a commit message that explains *why*, not just *what*. The commit log
  is the project's diary — `git log --oneline` should read like the table of
  contents for what's been built.
- For backend changes, prefer adding a test under `concilium-api/src/test/`
  over relying on manual verification.
- For frontend changes, run through the boardroom flow end-to-end at least
  once before requesting review.
- Mention any planning-doc references in your PR description
  (`ai-committee-business-requirements.md` has FR-C* numbers if relevant).

## Out-of-scope (for the PoC)

These are deliberately not in the current scope — please file an issue to
discuss before implementing, since they involve larger architectural choices:

- Real authentication / MFA (currently `StubAuthFilter`)
- Multi-tenancy / workspaces
- Cloud deployment / KMS-backed signing (the `LocalKeystoreSigner` is a swap
  target; design lives in `ai-committee-solution-architecture.md`)
- Orchestration patterns beyond Round Robin (Vote, Parallel-Score, Debate,
  Hierarchical — these are roadmap items per the BRD)

## Reporting bugs

Use the bug-report template in `.github/ISSUE_TEMPLATE/`. Include the steps
to reproduce, the expected behavior, and what you saw instead.

## Reporting security issues

Please don't open a public issue. Email the maintainer or use GitHub's
private vulnerability reporting feature.
