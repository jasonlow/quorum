# Prompts directory

Handlebars templates rendered by `PromptTemplates` and consumed by
the orchestrator. **Version-tag any meaningful change** to a template
(rename to `*-v2.hbs`) so historical sessions remain reproducible
against the prompt they were actually run against.

| Template | Used by | Status |
|---|---|---|
| `agent-user-prompt.hbs` | `AgentInvoker` (Week 1) | Live |
| `cos-review.hbs` | `ChiefOfStaffService.review` (Week 2) | Stub |
| `cos-challenge.hbs` | `ChiefOfStaffService.challenge` (Week 2) | Stub |
| `consolidation.hbs` | `Consolidator.build` (Week 2) | Stub |
