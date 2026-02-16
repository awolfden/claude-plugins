---
name: docs
description: Generate documentation for code
allowed-tools: [Bash, Read, Glob, Grep, Write, Edit]
---

Generate comprehensive documentation for functions, classes, modules, and projects.

## Usage

- `/docs <file>` - Generate documentation for a specific file
- `/docs <directory>` - Generate documentation overview for a directory
- `/docs` - Generate documentation for the current project

## Process

1. Identify the target (file, directory, or project)
2. Read and analyze the code structure
3. Identify functions, classes, methods, and modules
4. Generate appropriate documentation format based on language
5. Present documentation for review
6. Apply documentation to files if approved

## Documentation Formats by Language

### JavaScript/TypeScript (JSDoc)
```javascript
/**
 * Brief description of the function.
 *
 * @param {string} name - Description of the parameter
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether feature is enabled
 * @returns {Promise<Result>} Description of return value
 * @throws {Error} When something goes wrong
 * @example
 * const result = await myFunction('test', { enabled: true });
 */
```

### Python (Docstrings)
```python
def my_function(name: str, options: dict) -> Result:
    """
    Brief description of the function.

    Args:
        name: Description of the parameter
        options: Configuration options
            - enabled: Whether feature is enabled

    Returns:
        Description of return value

    Raises:
        ValueError: When something goes wrong

    Example:
        >>> result = my_function('test', {'enabled': True})
    """
```

### Go (GoDoc)
```go
// MyFunction performs an operation with the given name.
// It accepts options to configure behavior.
//
// Example:
//
//	result, err := MyFunction("test", Options{Enabled: true})
func MyFunction(name string, options Options) (Result, error)
```

## Documentation Sections

### For Functions/Methods
- Brief description (what it does)
- Parameters with types and descriptions
- Return value description
- Exceptions/errors thrown
- Usage example

### For Classes
- Class purpose and responsibility
- Constructor parameters
- Public methods summary
- Usage example

### For Modules/Files
- Module purpose
- Exports summary
- Dependencies
- Usage example

## Output Options

1. **Inline** - Add documentation directly to source files
2. **Separate** - Generate a markdown documentation file
3. **Both** - Inline + separate overview file

## Important Rules

- Describe WHAT and WHY, not HOW (code shows how)
- Use present tense and active voice
- Keep descriptions concise but complete
- Include examples for non-obvious usage
- Don't document private/internal functions unless requested
- Preserve existing documentation style in the codebase
