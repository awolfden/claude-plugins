#!/usr/bin/env node

/**
 * Build script that compiles individual plugin JSON files into a single registry.
 *
 * Supports two plugin formats:
 *   1. Flat JSON files:  plugins/<name>.json  (legacy, full registry schema)
 *   2. Subdirectories:   plugins/<name>/plugin.json  (directory-based plugins)
 *
 * Subdirectory plugins that don't already have a flat JSON sibling are
 * automatically converted into registry entries.
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const PLUGINS_DIR = join(ROOT_DIR, 'plugins');
const REGISTRY_DIR = join(ROOT_DIR, 'registry');
const SITE_DIR = join(ROOT_DIR, 'site');

/**
 * Read the marketplace.json to get owner info for registry entries.
 */
async function getMarketplaceInfo() {
  try {
    const content = await readFile(join(ROOT_DIR, '.claude-plugin', 'marketplace.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Convert a directory-based plugin.json into a registry-compatible entry.
 */
function toRegistryEntry(dirName, pluginJson, marketplace) {
  const author = marketplace?.owner
    ? { name: marketplace.owner.name, github: marketplace.owner.github }
    : { name: 'Unknown' };

  return {
    id: dirName,
    name: pluginJson.name || dirName,
    description: pluginJson.description || '',
    version: pluginJson.version || '0.1.0',
    author,
    type: 'skill',
    categories: ['development'],
    tags: [dirName],
    repository: marketplace
      ? `https://github.com/${marketplace.owner.github}/claude-plugins`
      : undefined,
    installation: {
      type: 'settings-json',
      instructions: `Install the ${pluginJson.name || dirName} plugin from the marketplace`
    },
    requirements: {
      platforms: ['macos', 'linux', 'windows']
    },
    license: 'MIT',
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0]
  };
}

async function buildRegistry() {
  console.log('Building plugin registry...\n');

  const marketplace = await getMarketplaceInfo();
  const entries = await readdir(PLUGINS_DIR);

  const plugins = [];
  const errors = [];
  const seenIds = new Set();

  // 1. Read flat JSON files (legacy format, already registry-compatible)
  const jsonFiles = entries.filter(f => f.endsWith('.json'));
  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(PLUGINS_DIR, file), 'utf-8');
      const plugin = JSON.parse(content);
      plugins.push(plugin);
      seenIds.add(plugin.id);
      console.log(`  ✓ ${plugin.name} (${plugin.id}) [flat]`);
    } catch (err) {
      errors.push({ file, error: err.message });
      console.log(`  ✗ ${file}: ${err.message}`);
    }
  }

  // 2. Read subdirectory plugins (plugins/<name>/plugin.json)
  for (const entry of entries) {
    if (entry.endsWith('.json')) continue;
    const entryPath = join(PLUGINS_DIR, entry);
    const entryStat = await stat(entryPath);
    if (!entryStat.isDirectory()) continue;

    // Skip if we already loaded a flat JSON for this plugin
    if (seenIds.has(entry)) {
      console.log(`  – ${entry} (skipped, flat JSON already loaded)`);
      continue;
    }

    const pluginJsonPath = join(entryPath, 'plugin.json');
    try {
      const content = await readFile(pluginJsonPath, 'utf-8');
      const pluginJson = JSON.parse(content);
      const registryEntry = toRegistryEntry(entry, pluginJson, marketplace);
      plugins.push(registryEntry);
      seenIds.add(entry);
      console.log(`  ✓ ${registryEntry.name} (${registryEntry.id}) [directory]`);
    } catch (err) {
      // No plugin.json in this directory — skip silently
      if (err.code !== 'ENOENT') {
        errors.push({ file: `${entry}/plugin.json`, error: err.message });
        console.log(`  ✗ ${entry}/plugin.json: ${err.message}`);
      }
    }
  }

  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} plugin(s) failed to parse`);
  }

  // Sort plugins by name
  plugins.sort((a, b) => a.name.localeCompare(b.name));

  // Build registry object
  const registry = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    count: plugins.length,
    plugins
  };

  // Write registry file
  await mkdir(REGISTRY_DIR, { recursive: true });
  await writeFile(
    join(REGISTRY_DIR, 'plugins.json'),
    JSON.stringify(registry, null, 2)
  );

  // Also write to site directory for static hosting
  await mkdir(join(SITE_DIR, 'api'), { recursive: true });
  await writeFile(
    join(SITE_DIR, 'api', 'plugins.json'),
    JSON.stringify(registry, null, 2)
  );

  console.log(`\n✓ Registry built with ${plugins.length} plugins`);
  console.log(`  → registry/plugins.json`);
  console.log(`  → site/api/plugins.json`);
}

buildRegistry().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
