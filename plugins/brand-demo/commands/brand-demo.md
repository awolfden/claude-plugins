---
name: brand-demo
description: Brand the SE demo app for a prospect company from their website URL
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Task
  - WebFetch
  - WebSearch
  - AskUserQuestion
  - Agent
  - mcp__claude_ai_Notion__notion-search
  - mcp__claude_ai_Notion__notion-fetch
  - mcp__claude_ai_Notion__notion-update-page
---

# Brand Demo

Invoke the `brand-demo` skill to automatically brand the WorkOS SE demo application for a specific prospect company.

Pass the company website URL as an argument (e.g., `/brand-demo acme.com`). The skill will research the company, extract their branding, and apply it to the demo app.
