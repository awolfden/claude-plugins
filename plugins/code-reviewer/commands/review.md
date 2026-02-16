---
name: review
description: Perform a comprehensive code review
allowed-tools: [Bash, Read, Glob, Grep]
---

Perform comprehensive code reviews with security analysis, best practices checks, and improvement suggestions.

## Usage

- `/review` - Review staged changes
- `/review <file>` - Review a specific file
- `/review <directory>` - Review all files in a directory

## Process

1. Identify the target for review (staged changes, file, or directory)
2. Read and analyze the code thoroughly
3. Check for issues in the following categories:
   - **Security vulnerabilities** (OWASP Top 10)
   - **Bug risks** and logic errors
   - **Best practices** violations
   - **Performance** concerns
   - **Code style** and readability
4. Provide actionable feedback organized by severity

## Review Categories

### Security (Critical)
- SQL injection, XSS, command injection
- Authentication/authorization flaws
- Sensitive data exposure
- Insecure dependencies

### Bugs (High)
- Null pointer exceptions
- Race conditions
- Resource leaks
- Logic errors
- Edge cases not handled

### Best Practices (Medium)
- Code duplication
- Poor naming conventions
- Missing error handling
- Overly complex functions
- Missing input validation

### Performance (Low)
- Unnecessary loops or iterations
- Inefficient data structures
- N+1 queries
- Missing caching opportunities

### Style (Info)
- Inconsistent formatting
- Missing documentation
- Dead code

## Output Format

```
## Code Review Summary

### Critical Issues
- [Location]: Description and fix suggestion

### High Priority
- [Location]: Description and fix suggestion

### Medium Priority
- [Location]: Description and fix suggestion

### Low Priority / Suggestions
- [Location]: Description and fix suggestion

### Overall Assessment
Brief summary of code quality and main areas for improvement.
```

## Important Rules

- Always explain WHY something is an issue, not just what
- Provide specific fix suggestions with code examples when helpful
- Acknowledge good patterns and practices found
- Be constructive, not critical
- Focus on the most impactful issues first
