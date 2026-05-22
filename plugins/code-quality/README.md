# Code Quality Plugin

Thermo-nuclear code quality review with exceptionally rigorous standards focused on structural quality, maintainability, and elimination of complexity.

## Overview

This plugin provides a skill for performing code reviews that go beyond "does it work?" to ask "is this the simplest possible implementation?" It's inspired by the Cursor team's approach to code quality but adapted for Claude Code.

## Installation

Install via the Claude Code marketplace or manually by adding to your settings.

## Usage

```bash
/thermo-nuclear-review              # Review staged changes
/thermo-nuclear-review <file>       # Review specific file
/thermo-nuclear-review <PR-number>  # Review GitHub PR
```

## Core Philosophy

Be **ambitious about code structure** rather than settling for minor cleanups. The goal is to:
- Prevent files from growing beyond 1,000 lines without decomposition
- Eliminate scattered conditional logic (spaghetti code)
- Demand design clarity over functional implementations
- Push back on unnecessary type complexity
- Identify "code judo" moves that simplify dramatically

## Review Standards

### Non-Negotiable Rules

1. **File Size Boundary**: No file should cross 1,000 lines without strong justification
2. **Spaghetti Prevention**: No ad-hoc conditionals scattered through unrelated flows
3. **Design Over Working Code**: Demand clean design, not just functional implementations
4. **Type Clarity**: Push back on unnecessary `| null`, `any` types, and type assertions
5. **Complexity Reduction**: Actively look for ways to reduce concepts, branches, and layers

### Blocking Issues

- Preserving incidental complexity when cleaner solutions exist
- Adding unnecessary wrappers that obscure design
- Copy-pasting logic instead of extracting shared functionality
- Working around type errors with assertions instead of fixing types

## When to Use

- Before approving significant PRs (especially core architecture changes)
- For long-lived, frequently-modified code
- When "good enough" is not acceptable
- As a final quality gate for substantial features

## Credits

Inspired by the [Cursor Team Kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review) thermo-nuclear code quality review skill, adapted for Claude Code.

## License

MIT
