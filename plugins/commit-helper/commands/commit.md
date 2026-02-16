---
name: commit
description: Generate a conventional commit message for staged changes
allowed-tools: [Bash, Read, Glob, Grep]
---

Generate well-crafted conventional commit messages based on staged changes.

## Usage

- `/commit` - Analyze staged changes and generate a commit message

## Process

1. Run `git status` to check for staged changes
2. Run `git diff --cached` to analyze staged changes
3. Run `git log --oneline -5` to understand the repository's commit style
4. Determine the appropriate commit type and scope
5. Generate a commit message following conventional commits format
6. Present the message for user approval
7. Execute the commit with approved message

## Commit Message Format

```
type(scope): subject line (50 chars max)

Optional body explaining WHY this change was made.
Wrap at 72 characters.

Optional footer:
Closes #123
BREAKING CHANGE: description
```

## Commit Types

| Type       | Use For                                       |
| ---------- | --------------------------------------------- |
| `feat`     | New feature visible to users                  |
| `fix`      | Bug fix for existing functionality            |
| `docs`     | Documentation only changes                    |
| `style`    | Formatting, whitespace (no code logic change) |
| `refactor` | Code restructuring without behavior change    |
| `perf`     | Performance improvements                      |
| `test`     | Adding or updating tests                      |
| `build`    | Build system or external dependencies         |
| `ci`       | CI/CD configuration changes                   |
| `chore`    | Maintenance tasks (tooling, configs)          |

## Rules for Subject Line

1. Use imperative mood: "Add" not "Added"
2. Don't capitalize after the type
3. No period at the end
4. Keep under 50 characters (72 max)

## Detection Heuristics

- New files → likely `feat` or `test`
- Modified existing logic → `fix`, `refactor`, or `feat`
- Config/build files → `build`, `ci`, or `chore`
- README, docs/ → `docs`
- Test files only → `test`

## Important Rules

- Never commit without user approval of the message
- Never add Co-Authored-By unless explicitly requested
- Warn if staging potential secrets (.env, credentials, keys)
- Match the existing commit style in the repository
- If no changes are staged, prompt user to stage changes first
