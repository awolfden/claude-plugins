#!/usr/bin/env node

/**
 * Validates all plugin JSON files against the schema
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const PLUGINS_DIR = join(ROOT_DIR, 'plugins');
const SCHEMA_PATH = join(ROOT_DIR, 'registry', 'schema.json');

// Simple schema validator (no external dependencies)
function validatePlugin(plugin, schema) {
  const errors = [];

  // Check required fields
  for (const field of schema.required || []) {
    if (!(field in plugin)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate id format
  if (plugin.id && !/^[a-z0-9-]+$/.test(plugin.id)) {
    errors.push(`Invalid id format: ${plugin.id} (must be lowercase alphanumeric with hyphens)`);
  }

  // Validate version format
  if (plugin.version && !/^\d+\.\d+\.\d+$/.test(plugin.version)) {
    errors.push(`Invalid version format: ${plugin.version} (must be semver)`);
  }

  // Validate type
  const validTypes = ['skill', 'hook', 'mcp-server', 'prompt-template'];
  if (plugin.type && !validTypes.includes(plugin.type)) {
    errors.push(`Invalid type: ${plugin.type} (must be one of: ${validTypes.join(', ')})`);
  }

  // Validate categories
  const validCategories = [
    'productivity', 'development', 'git', 'testing', 'documentation',
    'ai', 'utilities', 'integrations', 'code-quality', 'devops'
  ];
  if (plugin.categories) {
    for (const cat of plugin.categories) {
      if (!validCategories.includes(cat)) {
        errors.push(`Invalid category: ${cat}`);
      }
    }
  }

  // Validate installation
  if (plugin.installation) {
    const validInstallTypes = ['settings-json', 'npm', 'manual', 'script'];
    if (!validInstallTypes.includes(plugin.installation.type)) {
      errors.push(`Invalid installation type: ${plugin.installation.type}`);
    }
  }

  return errors;
}

async function validateAll() {
  console.log('Validating plugins...\n');

  const schema = JSON.parse(await readFile(SCHEMA_PATH, 'utf-8'));
  const files = await readdir(PLUGINS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  let totalErrors = 0;
  const results = [];

  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(PLUGINS_DIR, file), 'utf-8');
      const plugin = JSON.parse(content);
      const errors = validatePlugin(plugin, schema);

      if (errors.length > 0) {
        console.log(`✗ ${file}`);
        errors.forEach(e => console.log(`    - ${e}`));
        totalErrors += errors.length;
        results.push({ file, valid: false, errors });
      } else {
        console.log(`✓ ${file}`);
        results.push({ file, valid: true, errors: [] });
      }
    } catch (err) {
      console.log(`✗ ${file}`);
      console.log(`    - Parse error: ${err.message}`);
      totalErrors++;
      results.push({ file, valid: false, errors: [err.message] });
    }
  }

  console.log(`\n${jsonFiles.length} files checked, ${totalErrors} error(s) found`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

validateAll().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
