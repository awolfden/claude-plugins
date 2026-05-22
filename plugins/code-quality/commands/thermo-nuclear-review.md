---
name: thermo-nuclear-review
description: Perform an exceptionally rigorous code review focused on structural quality and complexity elimination
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - AskUserQuestion
---

# Thermo-Nuclear Code Quality Review

Perform an exceptionally rigorous code review that demands high structural quality, maintainability, and elimination of complexity.

## Usage

- `/thermo-nuclear-review` - Review all staged changes with maximum rigor
- `/thermo-nuclear-review <file>` - Review a specific file or PR
- `/thermo-nuclear-review <PR-number>` - Review a GitHub PR

## What It Does

This skill applies non-negotiable standards:
- Files cannot cross 1,000 lines without justification
- No random conditionals scattered through unrelated code
- Demand design clarity over "working code"
- Push back on unnecessary type optionality and `any` types
- Identify opportunities to reduce complexity through restructuring

## When to Use

- Before approving significant PRs
- For changes to core architecture
- When reviewing long-lived, frequently-modified code
- As a final quality gate for substantial features
