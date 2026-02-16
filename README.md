# Claude Code Plugins

A collection of plugins for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that add slash commands for code review, commits, documentation, testing, and demo app branding.

## Installation

### 1. Add the marketplace

```
/plugin marketplace add awolfden/claude-plugins
```

### 2. Install plugins

Install individual plugins by name:

```
/plugin install brand-demo@awolfden-plugins
```

### 3. Restart Claude Code

Restart Claude Code for the new plugins to take effect. You should see the new slash commands available.

## Plugins

### `/brand-demo` — Brand Demo

Brands a demo application for a specific prospect company by researching their website and generating a configuration file with prospect-specific content.

```
/brand-demo stripe.com     # Brand the demo for Stripe
/brand-demo linear.app     # Brand the demo for Linear
```

Researches the company's brand identity (logo, colors, product features, value proposition), maps brand colors to the nearest Radix UI accent, and generates a `brand-config.json` with tailored hero copy, feature cards, trust stats, and dashboard content.

### `/review` — Code Reviewer

Performs comprehensive code reviews with security analysis, best practices checks, and improvement suggestions.

```
/review              # Review staged changes
/review src/auth.ts  # Review a specific file
/review src/         # Review all files in a directory
```

Checks for security vulnerabilities (OWASP Top 10), bug risks, best practice violations, performance concerns, and code style issues. Results are organized by severity.

### `/commit` — Commit Helper

Generates conventional commit messages based on staged changes.

```
/commit              # Analyze staged changes and generate a commit message
```

Analyzes your staged diff, determines the appropriate commit type (`feat`, `fix`, `refactor`, etc.), and generates a message following the [Conventional Commits](https://www.conventionalcommits.org/) format. Presents the message for approval before committing.

### `/docs` — Doc Generator

Generates documentation for functions, classes, modules, and projects.

```
/docs                # Generate docs for the current project
/docs src/utils.ts   # Generate docs for a specific file
/docs src/lib/       # Generate docs for a directory
```

Supports JSDoc (JavaScript/TypeScript), docstrings (Python), and GoDoc (Go). Can add documentation inline to source files, as separate markdown files, or both.

### `/test` — Test Runner

Intelligently runs relevant tests based on code changes and provides failure analysis.

```
/test                # Auto-detect and run tests for changed files
/test auth           # Run tests matching a pattern
/test src/auth.ts    # Run tests for a specific file
```

Auto-detects your test framework (Jest, Vitest, pytest, Go test, Mocha, RSpec), maps changed files to their test files, and runs only the relevant tests. When tests fail, provides root cause analysis and fix suggestions.

**Setup**: Copy `plugins/brand-demo/settings.example.json` to `plugins/brand-demo/settings.json` and set `demoAppPath` to the path of your demo app.

## Updating Plugins

To pull the latest version of installed plugins:

```
/plugin update code-reviewer@awolfden-plugins
```

Or update all plugins by opening the plugin manager:

```
/plugin
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on submitting new plugins.

## License

MIT License — see [LICENSE](LICENSE) for details.
