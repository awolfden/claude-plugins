# Working Memory -- thread-slack-1777531110.236939

Session: 2026-04-30
Question type: conceptual
Tracks completed: 1 (no local codebase), 2, 3, 4, 5
Confidence so far: 9/10

## Claims established
- WorkOS requires BOTH Postmark account token and server token (3 sources: public docs, blog, internal Slack)
- Server token = sending emails; Account token = validate sender signatures / fetch domains (2 sources: docs + internal Slack)
- WorkOS creates dedicated workos-transactional-s message stream in Postmark (1 source: public docs)
- Both tokens stored with Vault encryption (1 source: blog post)

## Blockers / unresolved
- No local codebase available (~/workos does not exist)
- Could not verify via Glean code search (no results returned)
