# Contributing to Claude Plugins Marketplace

Thank you for your interest in contributing to the Claude Plugins Marketplace! This guide will help you submit your own plugins.

## Types of Plugins

The marketplace supports several types of Claude Code extensions:

| Type | Description |
|------|-------------|
| `skill` | Custom slash commands that extend Claude Code's capabilities |
| `hook` | Scripts that run in response to Claude Code events |
| `mcp-server` | Model Context Protocol servers for tool integration |
| `prompt-template` | Reusable prompt templates for common tasks |

## Submitting a Plugin

### 1. Fork and Clone

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/claude-plugins.git
cd claude-plugins
```

### 2. Create Your Plugin File

Create a new JSON file in the `plugins/` directory:

```bash
# The filename should match your plugin ID
touch plugins/my-awesome-plugin.json
```

### 3. Plugin Schema

Your plugin JSON must follow this schema:

```json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "description": "A brief description (10-500 characters)",
  "longDescription": "Detailed description with usage examples...",
  "version": "1.0.0",
  "author": {
    "name": "Your Name",
    "github": "your-github-username",
    "email": "optional@email.com"
  },
  "type": "skill",
  "categories": ["productivity"],
  "tags": ["automation", "workflow"],
  "repository": "https://github.com/username/repo",
  "homepage": "https://your-docs-site.com",
  "installation": {
    "type": "settings-json",
    "config": {
      // Configuration to add to Claude Code settings
    },
    "instructions": "Human-readable installation instructions"
  },
  "requirements": {
    "claudeCodeVersion": "1.0.0",
    "dependencies": ["node", "npm"],
    "platforms": ["macos", "linux", "windows"]
  },
  "license": "MIT",
  "createdAt": "2025-02-13",
  "updatedAt": "2025-02-13"
}
```

#### Required Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (lowercase, alphanumeric, hyphens only) |
| `name` | Display name (max 50 characters) |
| `description` | Brief description (10-500 characters) |
| `version` | Semantic version (e.g., `1.0.0`) |
| `author` | Author object with at least `name` |
| `type` | One of: `skill`, `hook`, `mcp-server`, `prompt-template` |
| `installation` | Installation instructions object |

#### Categories

Choose from these categories:
- `productivity` - Workflow and efficiency tools
- `development` - General development utilities
- `git` - Git and version control
- `testing` - Testing and quality assurance
- `documentation` - Documentation generation
- `code-quality` - Linting, formatting, analysis
- `devops` - CI/CD and infrastructure
- `integrations` - Third-party integrations
- `utilities` - General utilities
- `ai` - AI and ML tools

### 4. Validate Your Plugin

```bash
npm run validate
```

This will check your plugin against the schema and report any errors.

### 5. Build and Test

```bash
# Build the registry
npm run build

# Preview the site locally
npm run dev
```

Visit `http://localhost:3000` to see your plugin in the marketplace.

### 6. Submit a Pull Request

1. Commit your changes:
   ```bash
   git add plugins/my-awesome-plugin.json
   git commit -m "Add my-awesome-plugin"
   ```

2. Push to your fork:
   ```bash
   git push origin main
   ```

3. Open a Pull Request on GitHub

## Plugin Examples

### Skill Plugin

```json
{
  "id": "quick-test",
  "name": "Quick Test",
  "description": "Run tests for the current file with a single command",
  "version": "1.0.0",
  "author": { "name": "Developer" },
  "type": "skill",
  "categories": ["testing"],
  "installation": {
    "type": "settings-json",
    "config": {
      "skills": {
        "qt": {
          "command": "/qt",
          "description": "Run tests for current file",
          "prompt": "Find and run tests related to the currently open file. Show results and any failures."
        }
      }
    }
  }
}
```

### Hook Plugin

```json
{
  "id": "pre-commit-lint",
  "name": "Pre-Commit Lint",
  "description": "Automatically lint files before committing",
  "version": "1.0.0",
  "author": { "name": "Developer" },
  "type": "hook",
  "categories": ["code-quality", "git"],
  "installation": {
    "type": "settings-json",
    "config": {
      "hooks": {
        "pre-commit": "npm run lint --fix"
      }
    }
  }
}
```

## Guidelines

### Do

- Provide clear, concise descriptions
- Include usage examples in `longDescription`
- Test your plugin before submitting
- Keep installation instructions simple
- Use appropriate categories and tags

### Don't

- Submit plugins that require paid services without disclosure
- Include malicious or harmful functionality
- Copy others' work without attribution
- Submit incomplete or broken plugins

## Questions?

Open an issue on GitHub or reach out to the maintainers.

Happy contributing! 🎉
