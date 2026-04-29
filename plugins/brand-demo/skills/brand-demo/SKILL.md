---
name: brand-demo
description: Brand the SE demo app for a prospect company from their website URL
---

# Brand Demo Skill

Automatically brand the WorkOS SE demo application for a specific prospect company. Given a company website URL, this skill researches the company's brand identity — logo, colors, product features, and value proposition — maps their colors to Radix UI theme accents, and applies branding to the demo app. Results are cached in Notion for instant reuse.

## Workflow

1. **Intake**: Parse the company URL, read settings, determine app type
2. **Cache Lookup**: Check Notion DB for existing brand assets
3. **Research**: If no cache hit, invoke the `brand-researcher` agent
4. **Color Mapping**: Map the brand color to the nearest Radix UI accent color
5. **Apply Branding**: Write `brand-config.ts` (local) OR `.env` + `brand-config.json` (legacy)
6. **Cache Write**: Store/update brand assets in Notion
7. **Summary**: Report what changed

## Phase 1: Intake

1. **Read the company URL** from the skill arguments (the text after `/brand-demo`). If no URL was provided, use `AskUserQuestion` to ask for one.

2. **Normalize the URL**: If it doesn't start with `http://` or `https://`, prepend `https://`.

3. **Read settings** from `${CLAUDE_PLUGIN_ROOT}/settings.json`:
   ```json
   {
     "appType": "local",
     "demoAppPaths": {
       "local": "~/Documents/se-local-demo-app",
       "legacy": "~/Documents/workos-se-authkit-nextjs-demo-app"
     },
     "notionDatabaseId": "...",
     "notionDataSourceId": "..."
   }
   ```
   - `appType` determines which branding strategy to use ("local" or "legacy")
   - The active demo app path is `demoAppPaths[appType]`
   - `notionDataSourceId` is used for Notion cache operations

4. **Extract the domain** from the URL: strip protocol, path, query params, and `www.` prefix. E.g., `https://www.stripe.com/payments` becomes `stripe.com`.

5. **Verify the demo app exists**:
   - For `local`: Check that `{demoAppPath}/src/app/lib/brand-config.ts` exists
   - For `legacy`: Check that `{demoAppPath}/.env` exists
   - If not found, tell the user to update `settings.json` and stop.

## Phase 2: Cache Lookup

Use the Notion MCP tools to check for cached brand assets.

1. **Search the Notion database** using `mcp__claude_ai_Notion__notion-search` with the `data_source_url` set to `collection://{notionDataSourceId}` and query set to the extracted domain.

2. **If a matching page is FOUND**:
   - Use `mcp__claude_ai_Notion__notion-fetch` to read all fields from the page
   - Present to user via `AskUserQuestion`:
     ```
     Question: "Found cached branding for {Company Name} (last updated {date}). What would you like to do?"
     Options:
     - "Apply cached branding (Recommended)" — Skip research, go to Phase 5
     - "Re-research" — Ignore cache, research fresh, overwrite cache
     - "Update and apply" — Research again and update the cache entry
     ```
   - If "Apply cached branding": extract all fields from cache, skip to Phase 5
   - If "Re-research" or "Update and apply": proceed to Phase 3

3. **If NOT FOUND**: proceed to Phase 3.

4. **If Notion tools are unavailable or the query fails**: warn the user, skip cache, proceed to Phase 3. Do not stop the workflow for cache failures.

## Phase 3: Research

Invoke the `brand-researcher` agent via the **Task** tool:

```
Task: brand-researcher
subagent_type: brand-demo:brand-researcher
Prompt: Research the brand identity of the company at {url}. Follow the instructions in {CLAUDE_PLUGIN_ROOT}/agents/brand-researcher.md. Return structured findings.
```

Wait for research to complete. Parse the returned findings:
- **Company Name** — required (used throughout config)
- **Domain** — for cache keying
- **Logo URL** — for brand logo
- **Primary Brand Color** — hex value for color mapping
- **Secondary Brand Color** — hex value if found
- **Suggested Gradient Colors** — pair of hex values for dithered gradient
- **Tagline/Slogan** — for company tagline
- **Company Description** — for company description
- **Product Features** — for feature cards (3-4 features with names and descriptions)
- **Value Proposition** — for hero heading generation
- **Customer Count** — for trust stats
- **Prospect-Specific Feature Copy** — 4 feature descriptions mentioning the company
- **Suggested Hero Copy** — heading and subheading
- **Research Notes** — full markdown for cache storage

### Handle Missing Data

If the agent returns "N/A" for critical fields, use `AskUserQuestion`:

**Missing logo**:
```
Question: "The brand researcher couldn't find a logo for {Company Name}. Can you provide one?"
Options:
- "Skip logo" — Don't set a logo (will use default SVG)
- "I'll provide a URL" — Enter a logo URL manually
```

**Missing brand color**:
```
Question: "Couldn't determine {Company Name}'s primary brand color. Which Radix accent color should we use?"
Options:
- "blue" — A safe default for most brands
- "purple" — Works well for tech companies
- "green" — Good for finance/health brands
- "Let me pick" — Choose from the full Radix color list
```

If the user chooses "Let me pick", present all 25 Radix colors via `AskUserQuestion`.

**Missing product features**: This is OK — use the Prospect-Specific Feature Copy from the researcher, or fall back to generic enterprise auth feature descriptions customized with the company name.

**Missing value proposition**: This is OK — use the Suggested Hero Copy from the researcher, or fall back to "Secure access for {Company Name}".

**Missing customer count**: This is OK — default to "10K+".

## Phase 4: Color Mapping

Read `${CLAUDE_PLUGIN_ROOT}/shared/radix-color-map.md` for the color reference table.

### Mapping Algorithm

Given the brand's primary hex color (e.g., `#6E56CF`):

1. **Parse the hex color to RGB**:
   - `#6E56CF` -> R:110, G:86, B:207

2. **For each Radix color in the table**, parse its hex to RGB and compute the Euclidean distance:
   ```
   distance = sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
   ```

3. **Select the Radix color with the smallest distance**.

4. **Present the result** to the user for confirmation:
   ```
   The closest Radix accent color to {brand hex} is "{radix color name}" ({radix hex}).
   ```
   Use `AskUserQuestion`:
   ```
   Question: "Use '{radix color}' as the accent color for the demo?"
   Options:
   - "{radix color} (Recommended)" — Best match for {brand hex}
   - "Let me pick another" — Choose a different Radix accent color
   ```

   If the user wants to pick another, present the full list of 25 Radix colors.

## Phase 5: Apply Branding

Read `appType` from settings to determine which strategy to use.

---

### For `appType: "local"` (new demo app)

Generate and write a complete `brand-config.ts` to `{demoAppPath}/src/app/lib/brand-config.ts`.

1. **Read the current `brand-config.ts`** to understand the interface structure and defaults. Preserve all type definitions (`FeatureCard`, `TrustStat`, `QuickAction`, `StatusItem`, `BrandConfig`) and the `getBrandConfig()` export exactly as-is.

2. **Generate a new `brandConfig` object** with all research data:

   ```typescript
   export const brandConfig: BrandConfig = {
     company: {
       name: "{Company Name}",
       tagline: "{Tagline}",
       description: "{Description}. Powered by WorkOS AuthKit.",
       domain: "{domain}",
     },
     logo: {
       url: "{Logo URL}",
       altText: "{Company Name} logo",
     },
     theme: {
       accentColor: "{radix_color}",
       primaryHex: "{primary_hex}",
       secondaryHex: "{secondary_hex}",  // omit if N/A
       gradient: {
         enabled: true,
         colors: ["{gradient_color_1}", "{gradient_color_2}"],
       },
     },
     hero: {
       heading: "{Suggested Hero Heading}",
       subheading: "{Suggested Hero Subheading}",
       ctaText: "Get Started",
     },
     features: [
       {
         title: "Single Sign-On",
         description: "{Prospect-specific SSO copy}",
         icon: "LockClosedIcon",
       },
       {
         title: "Directory Sync",
         description: "{Prospect-specific Directory Sync copy}",
         icon: "PersonIcon",
       },
       {
         title: "Multi-Factor Auth",
         description: "{Prospect-specific MFA copy}",
         icon: "LockOpen1Icon",
       },
       {
         title: "Audit Logs",
         description: "{Prospect-specific Audit Logs copy}",
         icon: "ActivityLogIcon",
       },
     ],
     trust: {
       heading: "Enterprise-grade security and compliance",
       stats: [
         { value: "SOC 2", label: "Type II Certified" },
         { value: "99.99%", label: "Uptime SLA" },
         { value: "GDPR", label: "Compliant" },
         { value: "{Customer Count or 10K+}", label: "Companies Trust {Company Name}" },
       ],
     },
     dashboard: {
       welcomeHeading: "Welcome back, {{firstName}}",
       welcomeSubheading: "Manage your {{companyName}} workspace",
       statusItems: [
         { label: "Authentication", icon: "LockClosedIcon", value: "Active" },
         { label: "Team Members", icon: "PersonIcon", value: "Synced" },
         { label: "Audit Trail", icon: "ActivityLogIcon", value: "Recording" },
       ],
     },
     quickActions: [
       {
         title: "Settings",
         description: "Manage your profile, security, and team settings.",
         href: "/user-settings",
         icon: "GearIcon",
       },
       {
         title: "Logs",
         description: "View authentication logs and decoded tokens.",
         href: "/logs",
         icon: "ActivityLogIcon",
       },
     ],
   };
   ```

3. **Write the full file** using the `Write` tool. The file must include:
   - All interface/type definitions (unchanged from current file)
   - The new `brandConfig` const
   - The `getBrandConfig()` export

4. **Keep `dashboard` and `quickActions` at their defaults** — these are WorkOS-specific, not prospect-specific.

5. If the logo URL is "N/A" or was skipped, omit the `logo` property entirely.

6. **Gradient is always enabled** when branding for a prospect on the local app.

---

### For `appType: "legacy"` (old demo app)

**Update `.env`**:

Write the researched brand data to `{demoAppPath}/.brand-cache/{slug}.json` using the Write tool. **Note**: the `brandConfig` field is populated after Phase 4c generates the config — write the cache file once at the end of Phase 4c with the complete data including `brandConfig`.

```json
{
  "companyName": "{Company Name}",
  "domain": "{normalized domain}",
  "logoUrl": "{logo_url}",
  "primaryBrandColor": "{brand_hex}",
  "accentColor": "{chosen_radix_color}",
  "tagline": "{tagline}",
  "description": "{company_description}",
  "features": [{"name": "...", "description": "..."}],
  "valueProposition": "{value_prop}",
  "customerCount": "{count}",
  "cachedAt": "{ISO 8601 timestamp}",
  "brandConfig": { /* the complete brand-config.json object generated in Phase 4c */ }
}
```

Create the `.brand-cache/` directory if it doesn't exist (use `mkdir -p` via Bash). Add `.brand-cache/` to `.gitignore` if not already present.

### 4b: Update Environment File

**Determine the correct env file** — read the project's `package.json` to detect the framework:
- **Next.js** (has `next` in dependencies) → use `.env.local` (gitignored by default, preferred for local overrides)
- **Vite** (has `vite` in dependencies) → use `.env.local`
- **All others** → use `.env`

If the preferred env file doesn't exist, create it using the Write tool. If it exists, read it before editing.

Find and replace the `ACCENT_COLOR` and `PROSPECT_LOGO` lines.

- If the lines exist, use the Edit tool to replace them
- If the lines don't exist, append them to the end of the file
- Only modify **uncommented** lines. Do not touch commented lines.

**Generate and write `brand-config.json`**:

Generate a complete `brand-config.json` and write it to `{demoAppPath}/brand-config.json` using the Write tool.

Content generation rules:

- **company section**: Use researched Company Name, Tagline (or generate from Description), Description + " Powered by WorkOS AuthKit."
- **hero section**: Use Suggested Hero Copy from researcher. If not available, generate heading from Value Proposition with a security angle, subheading as "Enterprise-grade authentication for {Company Name}..."
- **features section**: Use Prospect-Specific Feature Copy from researcher. Always 4 cards: SSO (LockClosedIcon), Directory Sync (PersonIcon), MFA (LockOpen1Icon), Audit Logs (ActivityLogIcon).
- **trust section**: heading "Enterprise-grade security and compliance", 4 stats (SOC 2, 99.99% Uptime, GDPR, Customer Count)
- **dashboard section**: welcomeHeading "Welcome back, {{firstName}}", welcomeSubheading "Manage your {{companyName}} workspace"
- **quickActions section**: Settings, Integrations, Logs cards

**Valid icon names**: `LockClosedIcon`, `LockOpen1Icon`, `PersonIcon`, `GlobeIcon`, `GearIcon`, `Link1Icon`, `ActivityLogIcon`, `RocketIcon`, `MixIcon`, `LayersIcon`, `BarChartIcon`, `CheckCircledIcon`

## Phase 6: Cache Write

Store or update the brand assets in the Notion database for future reuse.

1. **If this was a new research** (no cache hit existed):
   - Use `mcp__claude_ai_Notion__notion-create-pages` with `data_source_id` set to the `notionDataSourceId` from settings
   - Create a page with all brand fields:
     ```json
     {
       "Domain": "{domain}",
       "Company Name": "{company_name}",
       "Accent Color": "{radix_color}",
       "Logo URL": "{logo_url}",
       "Primary Color": "{primary_hex}",
       "Secondary Color": "{secondary_hex}",
       "Gradient Colors": "[\"color1\", \"color2\"]",
       "Tagline": "{tagline}",
       "Description": "{description}",
       "Feature Copy": "[\"SSO copy\", \"Dir Sync copy\", \"MFA copy\", \"Audit copy\"]",
       "Hero Heading": "{heading}",
       "Hero Subheading": "{subheading}",
       "Research Notes": "{full markdown research notes}",
       "date:Last Updated:start": "{ISO datetime}",
       "date:Last Updated:is_datetime": 1,
       "Last Branded By": "{current user or 'SE'}"
     }
     ```

2. **If this was an "Update and apply"** from Phase 2:
   - Use `mcp__claude_ai_Notion__notion-update-page` to update the existing page with fresh data

3. **If Notion write fails**: apply branding anyway and warn the user that the cache wasn't updated. Never block branding on cache failures.

## Phase 7: Summary

After all edits are applied, present a summary:

```markdown
## Branding Applied: {Company Name}

**Accent Color**: {radix_color} (matched from {brand_hex})
**Logo**: {logo_url}
**Gradient**: Dithered ({color1} -> {color2})
**Demo App**: {appType} at {demoAppPath}
**Notion Cache**: {Created new entry | Updated existing | Applied from cache}

### Files Modified
- `src/app/lib/brand-config.ts` — Full brand configuration (local app)
OR
- `.env` + `brand-config.json` — Environment and config (legacy app)

### Next Steps
- Restart the dev server: `npm run dev`
- Preview at http://localhost:3000
```

## Error Handling

| Scenario | Action |
|----------|--------|
| Company website unreachable | Ask user for company name and brand color manually |
| No logo found | Ask user to provide a URL or skip (uses default SVG) |
| No brand color found | Ask user to pick a Radix accent color |
| Product features not found | Use Prospect-Specific Feature Copy or generic descriptions |
| Value proposition not found | Use Suggested Hero Copy or "Secure access for {Company Name}" |
| Customer count not found | Use "10K+" as default trust stat |
| Demo app not at configured path | Tell user to update `settings.json` |
| Notion MCP tools unavailable | Warn user, skip cache, proceed with research-only mode |
| Notion database not found | Tell user to check `notionDataSourceId` in settings |
| Notion query/write fails | Log error, skip cache, proceed with branding |
| `brand-config.ts` write fails | Stop and report — this is a critical failure |
| Legacy app `.env` missing expected variables | Add new lines rather than replacing |

## Critical Constraints

- **Always read files before editing** — the demo app may have been previously branded
- **Never guess brand colors** — use researched hex values or ask the user
- **Write the full `brand-config.ts`** for local app — don't use Edit for partial changes; Write the complete file to avoid merge issues with previous brandings
- **Keep type definitions unchanged** — only modify the `brandConfig` const values in brand-config.ts
- **Don't modify component files** — all page content is driven by config files
- **Write complete configs** — always write every field, never partial
- **Use only valid icon names** — see the icon reference in Phase 5
- **Don't restart the dev server** — just remind the user to do it
- **Cache failures are non-fatal** — always apply branding even if Notion is unavailable
- **Gradient is always enabled** when branding for a prospect on the local app
