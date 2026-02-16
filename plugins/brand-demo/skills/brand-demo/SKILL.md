---
name: brand-demo
description: Brand the SE demo app for a prospect company from their website URL
---

# Brand Demo Skill

Automatically brand the WorkOS SE demo application for a specific prospect company. Given a company website URL, this skill researches the company's brand identity — logo, colors, product features, and value proposition — then generates a `brand-config.json` that drives the demo app's customizable home pages, and updates `.env` for the accent color and logo.

## Workflow

1. **Intake**: Parse the company URL and locate the demo app
2. **Research**: Invoke the `brand-researcher` agent to extract brand assets and product info
3. **Color Mapping**: Map the brand color to the nearest Radix UI accent color
4. **Apply Branding**: Update `.env` and generate `brand-config.json`
5. **Summary**: Report what changed and remind to restart the dev server

## Phase 1: Intake

1. **Read the company URL** from the skill arguments (the text after `/brand-demo`). If no URL was provided, use `AskUserQuestion` to ask for one.

2. **Normalize the URL**: If it doesn't start with `http://` or `https://`, prepend `https://`.

3. **Read the demo app path** from `${CLAUDE_PLUGIN_ROOT}/settings.json`:
   ```json
   {
     "demoAppPath": "~/path/to/your/demo-app"
   }
   ```

4. **Verify the demo app exists**: Check that `{demoAppPath}/.env` exists. Also check if `{demoAppPath}/brand-config.json` exists (it will be created or overwritten). If `.env` doesn't exist, tell the user to update `settings.json` with the correct path and stop.

## Phase 2: Research

Invoke the `brand-researcher` agent via the **Task** tool:

```
Task: brand-researcher
subagent_type: general-purpose
Prompt: Research the brand identity of the company at {url}. Follow the instructions in {CLAUDE_PLUGIN_ROOT}/agents/brand-researcher.md. Return structured findings with company name, logo URL, primary brand color (hex), secondary brand color, tagline, description, product features, value proposition, and customer count.
```

Wait for research to complete. Parse the returned findings:
- **Company Name** — required (used throughout config)
- **Logo URL** — for `PROSPECT_LOGO` env var
- **Primary Brand Color** — hex value for color mapping
- **Tagline** — for company.tagline and hero.subheading
- **Company Description** — for company.description
- **Product Features** — for feature cards (3-4 features with names and descriptions)
- **Value Proposition** — for hero.heading generation
- **Customer Count** — for trust stats (e.g., "20K+ Companies Trust {Name}")

### Handle Missing Data

If the agent returns "N/A" for critical fields, use `AskUserQuestion`:

**Missing logo**:
```
Question: "The brand researcher couldn't find a logo for {Company Name}. Can you provide one?"
Options:
- "Skip logo" — Don't update PROSPECT_LOGO
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

**Missing product features**: This is OK — the skill will use generic enterprise auth feature descriptions, customized with the company name.

**Missing value proposition**: This is OK — the skill will use "Secure access for {Company Name}" as the hero heading.

**Missing customer count**: This is OK — the skill will default to "10K+".

## Phase 3: Color Mapping

Read `${CLAUDE_PLUGIN_ROOT}/shared/radix-color-map.md` for the color reference table.

### Mapping Algorithm

Given the brand's primary hex color (e.g., `#6E56CF`):

1. **Parse the hex color to RGB**:
   - `#6E56CF` → R:110, G:86, B:207

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

## Phase 4: Apply Branding

Now apply the branding to the demo app. **Read each file before editing.**

### 4a: Update `.env`

Read `{demoAppPath}/.env`. Find and replace the `ACCENT_COLOR` and `PROSPECT_LOGO` lines.

**If the lines exist** (they may be commented or uncommented), use the Edit tool to replace them:

```
Old: ACCENT_COLOR=iris
New: ACCENT_COLOR={chosen_radix_color}
```

```
Old: PROSPECT_LOGO=https://example.com/logo.png
New: PROSPECT_LOGO={logo_url}
```

**Important**: The `.env` file may have multiple commented-out blocks for different prospects. Only modify the **uncommented** `ACCENT_COLOR` and `PROSPECT_LOGO` lines. Do not touch commented lines.

**If the lines don't exist**, append them to the end of the file:
```
# {Company Name}
ACCENT_COLOR={chosen_radix_color}
PROSPECT_LOGO={logo_url}
```

### 4b: Generate and Write `brand-config.json`

Generate a complete `brand-config.json` and write it to `{demoAppPath}/brand-config.json` using the Write tool. The demo app reads this file to populate all page content.

**Content generation rules:**

**company section:**
- `name`: Use the researched Company Name
- `tagline`: Use the researched Tagline. If "N/A", generate a concise tagline from the Company Description (5-8 words)
- `description`: Use the researched Company Description. Append " Powered by WorkOS AuthKit." at the end

**hero section:**
- `heading`: Generate from the Value Proposition — reframe with a security/access angle. Examples:
  - Value prop "The leading customer data platform" → heading "Secure access for your data platform"
  - Value prop "Modern analytics for product teams" → heading "Secure your product analytics workspace"
  - Value prop "N/A" → heading "Secure access for {Company Name}"
  The heading should connect the prospect's product to authentication/security.
- `subheading`: Generate a 1-2 sentence description: "Enterprise-grade authentication for {Company Name}. Single sign-on, directory sync, and multi-factor authentication — all powered by WorkOS."
- `ctaText`: Default to "Sign In"

**features section** (exactly 4 cards):
Generate 4 feature cards for enterprise auth capabilities. Each card should be tailored to the prospect's product and industry.

The 4 features are always:
1. **Single Sign-On** — icon: `LockClosedIcon`
2. **Directory Sync** — icon: `PersonIcon`
3. **Multi-Factor Auth** — icon: `LockOpen1Icon`
4. **Audit Logs** — icon: `ActivityLogIcon`

For the description of each card, reference the prospect's product. Examples:
- Generic: "Connect your identity provider for seamless, secure access across all your tools."
- For a data platform: "Connect your identity provider for seamless access to your customer data platform."
- For a design tool: "Connect your identity provider so your design team can access projects securely."

If Product Features were found by the researcher, use them to inform the descriptions — reference the prospect's actual product capabilities in the auth feature descriptions.

**trust section:**
- `heading`: "Enterprise-grade security and compliance"
- `stats`: Always 4 items:
  1. `{ "value": "SOC 2", "label": "Type II Certified" }`
  2. `{ "value": "99.99%", "label": "Uptime SLA" }`
  3. `{ "value": "GDPR", "label": "Compliant" }`
  4. If Customer Count was found: `{ "value": "{count}+", "label": "Companies Trust {Company Name}" }`
     If not found: `{ "value": "10K+", "label": "Companies Trust {Company Name}" }`

**dashboard section:**
- `welcomeHeading`: Always `"Welcome back, {{firstName}}"`
- `welcomeSubheading`: Always `"Manage your {{companyName}} workspace"`
- `statusItems`: Always these 3 items:
  ```json
  [
    { "label": "Authentication", "icon": "LockClosedIcon", "value": "Active" },
    { "label": "Team Members", "icon": "PersonIcon", "value": "Synced" },
    { "label": "Integrations", "icon": "Link1Icon", "value": "Connected" }
  ]
  ```

**quickActions section** (exactly 3 cards):
- Settings card: `{ "title": "Settings", "description": "Manage your profile, security, and team settings.", "href": "/user-settings", "icon": "GearIcon" }`
- Integrations card: `{ "title": "Integrations", "description": "Connect your tools and manage data pipelines.", "href": "/integrations", "icon": "Link1Icon" }`
  - If the prospect's product has a specific integration angle, customize the description (e.g., for a data platform: "Connect your data sources and manage pipelines.")
- Logs card: `{ "title": "Logs", "description": "View authentication logs and decoded tokens.", "href": "/logs", "icon": "ActivityLogIcon" }`

**Write the complete JSON file** using the Write tool. Do not write a partial config. Ensure valid JSON formatting.

**Valid icon names**: `LockClosedIcon`, `LockOpen1Icon`, `PersonIcon`, `GlobeIcon`, `GearIcon`, `Link1Icon`, `ActivityLogIcon`, `RocketIcon`, `MixIcon`, `LayersIcon`, `BarChartIcon`, `CheckCircledIcon`

## Phase 5: Summary

After all edits are applied, present a summary:

```markdown
## Branding Applied: {Company Name}

**Accent Color**: {radix_color} (matched from {brand_hex})
**Logo**: {logo_url}
**Demo App Path**: {demoAppPath}

### Files Modified
- `.env` — Updated ACCENT_COLOR and PROSPECT_LOGO
- `brand-config.json` — Generated prospect-specific content configuration

### Content Generated
- Hero: "{hero.heading}"
- Features: 4 prospect-tailored feature cards
- Trust: Enterprise compliance stats
- Dashboard: Personalized welcome with template variables

### Next Steps
- Restart the dev server if it's running: `npm run dev`
- Preview at http://localhost:3000
- Review `brand-config.json` and tweak any copy if needed
- Sign in to see the branded dashboard
```

## Error Handling

| Scenario | Action |
|----------|--------|
| Company website unreachable | Ask user for company name and brand color manually |
| No logo found | Ask user to provide a URL or skip logo |
| No brand color found | Ask user to pick a Radix accent color |
| Product features not found by researcher | Use default descriptions, customize with company name |
| Value proposition not found | Use "Secure access for {Company Name}" as hero heading |
| Customer count not found | Use "10K+" as default trust stat |
| Demo app not at configured path | Tell user to update `settings.json` |
| `.env` missing expected variables | Add new lines rather than replacing |

## Critical Constraints

- **Always read files before editing** — the demo app may have been previously branded
- **Never guess brand colors** — use researched hex values or ask the user
- **Preserve `.env` structure** — only modify uncommented ACCENT_COLOR and PROSPECT_LOGO lines
- **Don't modify component files or page.tsx** — all page content is driven by brand-config.json
- **Write complete configs** — always write every field in brand-config.json, never partial
- **Use only valid icon names** — see the icon reference in Phase 4b
- **Don't restart the dev server** — just remind the user to do it
- **Use the Edit tool** for `.env` changes — use the Write tool for `brand-config.json`
