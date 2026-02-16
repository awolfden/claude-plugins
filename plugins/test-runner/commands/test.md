---
name: test
description: Run relevant tests for recent changes
allowed-tools: [Bash, Read, Glob, Grep]
---

Intelligently run relevant tests based on code changes and provide detailed failure analysis.

## Usage

- `/test` - Auto-detect and run tests for recently changed files
- `/test <pattern>` - Run tests matching a specific pattern
- `/test <file>` - Run tests for a specific file

## Process

1. Detect the test framework in use (Jest, Vitest, pytest, Go test, etc.)
2. Identify changed files (staged, unstaged, or recent commits)
3. Map changed files to their test files
4. Run relevant tests
5. If failures occur, analyze and suggest fixes
6. Report results

## Framework Detection

| Framework | Detection                                      | Run Command                    |
| --------- | ---------------------------------------------- | ------------------------------ |
| Jest      | jest.config.js, package.json "jest"            | `npx jest`                     |
| Vitest    | vitest.config.ts, package.json "vitest"        | `npx vitest run`               |
| pytest    | pytest.ini, pyproject.toml, conftest.py        | `pytest`                       |
| Go test   | *_test.go files                                | `go test`                      |
| Mocha     | .mocharc.*, package.json "mocha"               | `npx mocha`                    |
| RSpec     | .rspec, spec/ directory                        | `bundle exec rspec`            |

## Test File Mapping

Common patterns for finding related test files:
- `src/foo.ts` → `src/foo.test.ts`, `src/__tests__/foo.test.ts`, `tests/foo.test.ts`
- `lib/foo.py` → `tests/test_foo.py`, `lib/test_foo.py`
- `pkg/foo.go` → `pkg/foo_test.go`

## Failure Analysis

When tests fail, provide:

1. **Failure Summary**
   - Which tests failed
   - Error messages

2. **Root Cause Analysis**
   - Why the test likely failed
   - Connection to recent changes

3. **Fix Suggestions**
   - Code changes to fix the issue
   - Whether the test or implementation needs updating

## Output Format

```
## Test Results

### Summary
✓ 45 passed
✗ 2 failed
○ 3 skipped

### Failures

#### test_user_authentication
File: tests/test_auth.py:42
Error: AssertionError: Expected 200, got 401

Analysis: The recent change to `validate_token()` now requires
the 'scope' claim which isn't present in the test fixture.

Suggested fix:
- Update test fixture to include 'scope' claim, OR
- Make 'scope' claim optional in validate_token()

### Next Steps
- Fix the 2 failing tests
- Run full test suite before committing
```

## Important Rules

- Always show test output for context
- For large test suites, run only relevant tests first
- If all related tests pass, offer to run full suite
- Don't modify test files without explicit approval
- Explain assertion failures in plain language
