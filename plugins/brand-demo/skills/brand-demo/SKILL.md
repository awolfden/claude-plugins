---
name: brand-demo
description: Brand the SE demo app for a prospect company from their website URL
---

# Brand Demo Skill

Automatically brand the WorkOS SE demo application for a specific prospect company. Given a company website URL, this skill researches the company's brand identity — logo, colors, product features, and value proposition — then generates a `brand-config.json` that drives the demo app's customizable home pages, and updates the environment file for the accent color and logo.

## Workflow

1. **Intake**: Parse the company URL and locate the demo app
2. **Cache Lookup**: Check for previously researched brand assets
3. **Research**: Invoke the `brand-researcher` agent to extract brand assets and product info (skipped on cache hit)
4. **Color Mapping**: Map the brand color to the nearest Radix UI accent color (skipped on cache hit)
5. **Apply Branding**: Persist cache, update env file, generate `brand-config.json`, store in Notion
6. **Summary**: Report what changed and remind to restart the dev server

## Phase 1: Intake

1. **Read the company URL** from the skill arguments (the text after `/brand-demo`). If no URL was provided, use `AskUserQuestion` to ask for one.

2. **Normalize the URL**: If it doesn't start with `http://` or `https://`, prepend `https://`.

3. **Read the demo app path** from `${CLAUDE_PLUGIN_ROOT}/settings.json`:
   ```json
   {
     "demoAppPath": "~/path/to/your/demo-app"
   }
   ```

4. **Verify the demo app exists**: Check that `{demoAppPath}/package.json` exists (confirms it's a valid project). Also check if `{demoAppPath}/brand-config.json` exists (it will be created or overwritten). If `package.json` doesn't exist, tell the user to update `settings.json` with the correct path and stop. The env file (`.env.local` or `.env`) will be created if it doesn't exist.

5. **Check env file permissions**: Verify that Claude can read and edit `.env.local` autonomously. Try reading `{demoAppPath}/.env.local` with the Read tool. If the read succeeds, permissions are fine — proceed. If the read is denied, permissions need to be configured.

   **Important: deny rules take precedence over allow rules.** If the user's global `~/.claude/settings.json` has deny rules like `Read(.env.*)` or `Read(**/.env*)`, a project-level allow in `settings.local.json` will NOT override them. The fix must happen at the level where the deny exists.

   If the read is denied, tell the user:
   ```
   The brand-demo skill needs permission to read and edit `.env.local` so it can update
   branding env vars (ACCENT_COLOR, PROSPECT_LOGO) autonomously.

   This requires two things:

   1. **Global settings** (`~/.claude/settings.json`): Make sure there are no deny rules
      blocking `.env.local`. Rules like `Read(.env.*)` or `Read(**/.env*)` will block
      access regardless of project-level allows. You can safely narrow these to just
      `Read(.env)` to protect production secrets while allowing `.env.local`.

   2. **Project settings** (`{demoAppPath}/.claude/settings.local.json`): Add explicit
      allow rules for the env file:
      {
        "permissions": {
          "allow": [
            "Read(.env.local)",
            "Edit(.env.local)"
          ]
        }
      }
      This file is gitignored and only affects your local Claude Code session.
   ```

   Use `AskUserQuestion`:
   ```
   Question: "Set up env file permissions?"
   Options:
   - "Yes, fix both global and project settings" — Remove broad .env deny rules from global settings and add project-level allows
   - "Yes, project settings only" — Add allows to .claude/settings.local.json (may not work if global deny rules block it)
   - "No, I'll handle it" — Continue without autonomous env file access (you may be prompted for each edit)
   ```
   - If "Yes, fix both":
     - Read `~/.claude/settings.json` and remove `Read(.env.*)` and `Read(**/.env*)` from the deny array (keep `Read(.env)` to protect the base env file)
     - Then set up project-level allows (see below)
   - If "Yes, project settings only":
     - If `{demoAppPath}/.claude/settings.local.json` exists, read it and merge `"Read(.env.local)"` and `"Edit(.env.local)"` into the existing `permissions.allow` array (preserving all other permissions and settings)
     - If it doesn't exist, create it with the JSON shown above
     - Add `.claude/settings.local.json` to `{demoAppPath}/.gitignore` if not already present
     - Warn: "Note: this may not work if your global settings deny `.env*` reads. If env edits still prompt you, run the skill again and choose 'fix both'."
   - If "No, I'll handle it": proceed normally (the user will see permission prompts during env file edits)

## Phase 1.5: Cache Lookup

Before invoking the researcher, check for a cached brand profile:

1. **Compute the cache slug**: lowercase the company domain, strip protocol and `www.` (e.g., `https://www.acme.com` → `acme.com`)
2. **Check for `{demoAppPath}/.brand-cache/{slug}.json`**
3. If the cache file exists:
   - Read and parse it
   - Present a brief summary:
     ```
     Found cached brand assets for {companyName} (cached {cachedAt}):
       Color: {accentColor} | Logo: {logoUrl ? "yes" : "none"} | Features: {features.length} cards
     ```
   - Use `AskUserQuestion`:
     ```
     Question: "Use cached brand assets or re-research?"
     Options:
     - "Use cache" — Skip research and apply cached values
     - "Re-research" — Fetch fresh brand data from the website
     ```
   - If "Use cache":
     - Skip Phase 2 and Phase 3 entirely
     - If the cache contains a `brandConfig` object, also skip Phase 4b (env update) and Phase 4c (config generation) — just compare the cached env values and config against what's already on disk. Only write files that differ. Proceed to Phase 4d (Notion) and Phase 5 (Summary)
     - If the cache does NOT contain `brandConfig` (older cache format), proceed to Phase 4 normally to generate the config, then save it back to cache
4. If no cache file exists, proceed to Phase 2 as normal

**Cache file schema** (`{demoAppPath}/.brand-cache/{slug}.json`):
```json
{
  "companyName": "Acme Corp",
  "domain": "acme.com",
  "logoUrl": "https://...",
  "primaryBrandColor": "#6E56CF",
  "accentColor": "violet",
  "tagline": "The platform for modern teams",
  "description": "Acme Corp helps teams collaborate securely.",
  "features": [
    { "name": "Feature Name", "description": "1-sentence description" }
  ],
  "valueProposition": "The leading collaboration platform",
  "customerCount": "20K+",
  "cachedAt": "2026-03-23T12:00:00Z",
  "brandConfig": { ... }
}
```

The `brandConfig` field stores the complete generated `brand-config.json` object. This avoids regenerating identical content on subsequent runs.

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

### 4a: Persist Brand Cache

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

**If the lines exist** (they may be commented or uncommented), use the Edit tool to replace them:

```
Old: ACCENT_COLOR=iris
New: ACCENT_COLOR={chosen_radix_color}
```

```
Old: PROSPECT_LOGO=https://example.com/logo.png
New: PROSPECT_LOGO={logo_url}
```

**Important**: The env file may have multiple commented-out blocks for different prospects. Only modify the **uncommented** `ACCENT_COLOR` and `PROSPECT_LOGO` lines. Do not touch commented lines.

**If the lines don't exist**, append them to the end of the file:
```
# {Company Name}
ACCENT_COLOR={chosen_radix_color}
PROSPECT_LOGO={logo_url}
```

**Autonomy rule**: Never ask the user to manually edit env files. Never tell the user to run a command to set env vars. Claude MUST write the values directly using Edit (for existing lines) or Write (for new file). If the Edit tool fails because the old string isn't found, fall back to appending the vars.

### 4b.1: Update demo app browser-tab favicon

Next.js apps use `src/app/favicon.ico` (Next 13+ App Router) or `public/favicon.ico` (older) as the browser-tab favicon — this is the icon that shows in the tab strip when users visit the running demo. It is **not** affected by AuthKit dashboard branding (that controls the hosted auth pages only). Every brand-demo run must refresh this file so the demo matches the prospect.

1. **Locate the favicon**: Check `{demoAppPath}/src/app/favicon.ico` first, then `{demoAppPath}/public/favicon.ico`, then `{demoAppPath}/app/favicon.ico`. Use whichever path exists. If none exist but the demo uses Next.js App Router, default to `src/app/favicon.ico`.

2. **Generate a 32×32 PNG of the prospect logo** (Next.js accepts PNGs saved at `favicon.ico`; verify with `file` — existing demos are commonly `PNG image data, 32 x 32`).

   **Preferred path (simplest, works everywhere)**: if the brand logo has already been uploaded to the WorkOS dashboard, fetch the imgix URL with a resize query string — imgix handles the scaling server-side:
   ```bash
   curl -sL "{imgix_logo_url}?w=256&h=256&fit=fill&fill=solid&fill-color=ffffff&fm=png" -o /tmp/fav_src.png
   sips -z 32 32 /tmp/fav_src.png --out {demoAppPath}/src/app/favicon.ico >/dev/null
   ```

   **Fallback (no imgix URL available)**: use Chrome (if connected) to canvas-render the logo at 32×32 and download the PNG, or use `sips` directly on a downloaded source:
   ```bash
   curl -sL "{logo_url}" -o /tmp/fav_src
   sips -z 32 32 /tmp/fav_src --out {demoAppPath}/src/app/favicon.ico >/dev/null
   ```
   `sips` warns about the `.ico` suffix — ignore it, Next.js only cares about the file contents.

3. **Verify**: `file {demoAppPath}/src/app/favicon.ico` should report `PNG image data, 32 x 32`. `curl -s http://localhost:3000/favicon.ico | file -` should report the same if the dev server is running.

4. If neither `sips` (macOS) nor a suitable image tool is available on the user's system, note the gap in the summary and ask the user to replace the file manually — do not leave a stale favicon from a previous prospect in place.

### 4c: Generate and Write `brand-config.json`

**If the cache contains a `brandConfig` object** (cache hit with full config):
1. Read the existing `{demoAppPath}/brand-config.json` (if it exists)
2. Compare the cached `brandConfig` against the file on disk
3. If they match, skip writing — log "brand-config.json already up to date"
4. If they differ (or the file doesn't exist), write the cached `brandConfig` to `{demoAppPath}/brand-config.json`
5. Skip the generation rules below — proceed to Phase 4d

**If the cache does NOT contain `brandConfig`** (fresh research or older cache):

Generate a complete `brand-config.json` and write it to `{demoAppPath}/brand-config.json` using the Write tool. The demo app reads this file to populate all page content. After writing, save the generated config back to the cache file by updating `{demoAppPath}/.brand-cache/{slug}.json` with the `brandConfig` field.

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

### 4d: Store Brand Assets in Notion

If Notion MCP tools are available, persist brand assets alongside the Wiz-Kid deal page:

1. **Search for existing deal page**: Use `notion-search` with `content_search_mode: "workspace_search"` to find a page in the Deals database matching the company name. The default `ai_search` mode searches across all connected sources (Calendar, Slack, Drive) and will return irrelevant results — always use `workspace_search` when looking for Notion deal pages.
2. **If a deal page exists**:
   - Use `notion-fetch` to read the page content
   - Check if a "Brand Assets" section already exists
   - If it exists, update it. If not, append a new section using `notion-update-page`:
     ```
     ## Brand Assets
     - **Logo URL**: {logo_url}
     - **Accent Color**: {radix_color} (matched from {brand_hex})
     - **Tagline**: {tagline}
     - **Description**: {description}
     - **Features**: {feature_count} cards generated
     - **Last Branded**: {date}
     ```
3. **If no deal page exists**, skip Notion storage silently — don't create a deal page just for branding
4. **If Notion MCP tools are not available** (tools fail or aren't connected), skip silently and proceed

This step is best-effort — never block branding on Notion failures.

## Phase 4e: Update AuthKit Dashboard Branding

After applying local branding, offer to update the WorkOS AuthKit branding in the dashboard so the hosted auth pages (sign-in, sign-up, MFA) match the prospect's brand.

**Reference**: See `${CLAUDE_PLUGIN_ROOT}/shared/authkit-dashboard-branding.md` for detailed form structure and field mapping.

1. **Ask the user** via `AskUserQuestion`:
   ```
   Question: "Update AuthKit branding in the WorkOS dashboard?"
   Options:
   - "Yes, update dashboard branding" — Update colors and logo on dashboard.workos.com/branding
   - "Skip" — Continue without updating dashboard branding
   ```

2. **If "Yes"**, check Chrome availability by calling `mcp__claude-in-chrome__tabs_context_mcp(createIfEmpty: true)`. If the tool fails or is unavailable, fall back to providing manual instructions (see fallback below) and proceed to Phase 5.

3. **Verify login**: Navigate to the branding edit page and take a screenshot to confirm the user is logged in:
   ```
   mcp__claude-in-chrome__navigate(url: "https://dashboard.workos.com/branding/edit?preview=authkit", tabId: <tabId>)
   mcp__claude-in-chrome__computer(action: "wait", duration: 2, tabId: <tabId>)
   mcp__claude-in-chrome__computer(action: "screenshot", tabId: <tabId>)
   ```
   If the screenshot shows a login page instead of the branding editor, ask the user to log in:
   ```
   Question: "Please log in at https://dashboard.workos.com in Chrome, then confirm."
   Options:
   - "Done, I'm logged in" — Retry navigation
   - "Skip for now" — Continue without updating
   ```

4. **Map form fields**: Read the interactive elements to get current ref IDs:
   ```
   mcp__claude-in-chrome__read_page(tabId: <tabId>, filter: "interactive")
   ```
   From the output, identify:
   - All `textbox` elements with `placeholder="Hex color"` — these are the color fields
   - The `button "Save changes"` — this is the save button
   - Any `button type="file"` elements — these are logo upload inputs

   **Color field order** (filtering for `placeholder="Hex color"` textboxes only):
   ```
   [0] Page background, Light     [1] Page background, Dark
   [2] Button background, Light   [3] Button background, Dark
   [4] Button text, Light         [5] Button text, Dark
   [6] Links, Light               [7] Links, Dark
   ```

5. **Check appearance mode**: Before setting colors, check the "Preferred appearance" dropdown value. When appearance is **Light**, all dark mode color inputs are **disabled** — `form_input` silently fails on disabled inputs. Only set fields that match the active mode:
   - **Light** (most common): Only set light mode fields (hex indices 0, 2, 4, 6). Skip dark mode entirely.
   - **Dark**: Only set dark mode fields (hex indices 1, 3, 5, 7).
   - **Auto**: Set all fields.

6. **Set brand colors**: Use `form_input` to set hex values, pressing Return after each to commit. Use the `find` tool to locate fields — it's more reliable than parsing `read_page` output:

   ```
   find("Button background light mode text input with placeholder Hex color")  → ref for button bg
   find("Links light mode text input with placeholder Hex color")              → ref for links
   ```

   **Button background** (light mode) — set to `{brand_hex}` without the `#`:
   ```
   form_input(ref: <button_bg_light_ref>, value: "{brand_hex_no_hash}")  →  key("Return")
   ```

   **Links** (light mode) — set to `{brand_hex}` without the `#`:
   ```
   form_input(ref: <links_light_ref>, value: "{brand_hex_no_hash}")  →  key("Return")
   ```

   If appearance is **Auto** or **Dark**, also set the corresponding dark mode fields using `find` with "dark mode" in the query.

   **Button text**: Leave as FFFFFF unless the brand color is very light (luminance > 0.7), in which case set to a dark color like 1A1A1A.

   **Page background**: Leave as default unless specifically requested.

7. **Upload logo to Logo Icon and Logo slots** (if logo URL is available):

   Use JavaScript to fetch the logo image and programmatically set it on the file inputs. This is more reliable than the `upload_image` MCP tool (which fails cross-tab). Run via `javascript_tool`, uploading to **only indices 0 and 2** (not favicon yet — it must be uploaded separately after crop modals are dismissed):

   ```javascript
   (async () => {
     const logoUrl = '{logo_url}';
     const response = await fetch(logoUrl);
     const blob = await response.blob();
     const file = new File([blob], 'brand-logo.png', { type: blob.type || 'image/png' });
     const fileInputs = document.querySelectorAll('input[type="file"]');
     // Step 1: Only logo icon (0) and logo (2) — NOT favicon yet
     for (const idx of [0, 2]) {
       const input = fileInputs[idx];
       if (input) {
         const dt = new DataTransfer();
         dt.items.add(file);
         input.files = dt.files;
         input.dispatchEvent(new Event('change', { bubbles: true }));
       }
     }
     return 'Logo uploaded to icon + logo inputs';
   })()
   ```

   After the JS runs, **crop modals** will appear for logo and logo icon. For each modal:
   - Take a screenshot to see the crop UI
   - Click "Save changes" on the crop modal
   - Wait 1-2 seconds for the next modal to appear
   - Repeat until all crop modals are dismissed

8. **Upload favicon separately** (REQUIRED — DO NOT SKIP. DO NOT MERGE INTO STEP 7.):

   After all crop modals from step 7 are dismissed, upload the logo to the **favicon file input (index 4)** in a separate JS call.

   **Critical rules for favicons:**
   - **The favicon input enforces 1:1 aspect ratio** — non-square logos trigger the error "Image aspect ratio should be 1:1" and the file silently fails to save (the preview may show the image but save will drop it).
   - **Unlike logo/logo icon, the favicon input does NOT open a crop modal** — the dashboard expects the uploaded file to already be square.
   - **You MUST always canvas-pad the image to a 1:1 square before uploading**, regardless of whether the source logo looks square. Don't try the raw URL first — go straight to the canvas approach.
   - Favicon upload also silently fails when batched with logo/logo icon in the same JS call because the crop modals interrupt the change event processing. Always run this as a separate JS call.

   **Canvas-pad + upload** (always use this, never upload raw logo to favicon input):

   ```javascript
   (async () => {
     const logoUrl = '{logo_url}';
     const response = await fetch(logoUrl);
     const srcBlob = await response.blob();
     // Render onto a 512x512 white canvas so the output is always 1:1
     const img = new Image();
     const srcUrl = URL.createObjectURL(srcBlob);
     await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = srcUrl; });
     const canvas = document.createElement('canvas');
     canvas.width = 512; canvas.height = 512;
     const ctx = canvas.getContext('2d');
     ctx.fillStyle = '#FFFFFF';
     ctx.fillRect(0, 0, 512, 512);
     const target = 480; // leave 16px padding on each side
     const scale = Math.min(target / img.width, target / img.height);
     const w = img.width * scale, h = img.height * scale;
     ctx.drawImage(img, (512 - w) / 2, (512 - h) / 2, w, h);
     URL.revokeObjectURL(srcUrl);
     const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
     const file = new File([blob], 'brand-favicon.png', { type: 'image/png' });
     const fileInputs = document.querySelectorAll('input[type="file"]');
     const input = fileInputs[4]; // Favicon light mode
     if (!input) return 'Favicon input not found';
     const dt = new DataTransfer();
     dt.items.add(file);
     input.files = dt.files;
     input.dispatchEvent(new Event('change', { bubbles: true }));
     return `Favicon uploaded (${blob.size} bytes, 512x512 PNG)`;
   })()
   ```

   Wait 2 seconds, then **verify the favicon committed before saving**:

   ```javascript
   (() => {
     // Find the favicon preview image and check it's not in an error state
     const errs = Array.from(document.querySelectorAll('*')).filter(el =>
       el.textContent === 'Image aspect ratio should be 1:1' && el.children.length === 0
     );
     return JSON.stringify({
       aspectRatioErrors: errs.length,
       // Check the favicon preview src is a blob/data URL (not the default/old)
       previewSrcs: Array.from(document.querySelectorAll('img'))
         .map(i => i.src)
         .filter(s => s.startsWith('blob:') || s.startsWith('data:'))
         .length
     });
   })()
   ```

   If `aspectRatioErrors > 0`, the upload did not commit — re-run the canvas-pad script. Do not proceed to save until the error is gone.

   **If logo upload fails** (CORS error, fetch blocked, etc.), skip it and note in the summary that the user should upload the logo manually at `dashboard.workos.com/branding`.

9. **Save changes**: Click the save button and verify:
   ```
   mcp__claude-in-chrome__computer(action: "left_click", ref: <save_ref>, tabId: <tabId>)
   mcp__claude-in-chrome__computer(action: "wait", duration: 2, tabId: <tabId>)
   mcp__claude-in-chrome__computer(action: "screenshot", tabId: <tabId>)
   ```
   The page should navigate to `/branding` (view mode) after a successful save. If the screenshot still shows the edit page, the save may have failed — check for error messages.

10. **Post-save verification** (REQUIRED — do not skip):

    Reload the edit page and confirm all three assets (logo icon, logo, favicon) actually persisted. Save-succeeds-but-favicon-silently-dropped is a known failure mode, so verification is mandatory.

    ```
    mcp__claude-in-chrome__navigate(url: "https://dashboard.workos.com/branding/edit?preview=authkit", tabId: <tabId>)
    mcp__claude-in-chrome__computer(action: "wait", duration: 2, tabId: <tabId>)
    ```

    Then run this check:

    ```javascript
    (() => {
      // Each asset slot has a "Change" button when populated and an empty placeholder when not.
      // Inspect the three light-mode file input siblings (indices 0, 2, 4) for a populated preview.
      const fileInputs = document.querySelectorAll('input[type="file"]');
      const check = (idx, label) => {
        const input = fileInputs[idx];
        if (!input) return { label, ok: false, reason: 'input missing' };
        // Walk up to find the container, then look for an img inside
        let container = input.parentElement;
        for (let d = 0; d < 6 && container; d++) {
          const img = container.querySelector && container.querySelector('img');
          if (img && img.src && !img.src.includes('placeholder')) {
            return { label, ok: true, src: img.src.slice(0, 60) };
          }
          container = container.parentElement;
        }
        return { label, ok: false, reason: 'no preview image' };
      };
      return JSON.stringify([
        check(0, 'Logo icon'),
        check(2, 'Logo'),
        check(4, 'Favicon')
      ]);
    })()
    ```

    If any of the three reports `ok: false` — especially the favicon — re-run steps 7 or 8 for the missing asset, then save again. Do not report success until all three are populated.

11. **If "Skip"**, proceed to Phase 5 with no dashboard changes.

**Fallback** (Chrome tools unavailable): If `mcp__claude-in-chrome__tabs_context_mcp` fails, provide the user with manual instructions:
```
Update AuthKit branding manually at: https://dashboard.workos.com/branding

Click "Edit branding", then set:
- Button background (light + dark): {brand_hex}
- Links (light + dark): {brand_hex}
- Upload logo: {logo_url}
Click "Save changes" when done.
```

**Constraints**:
- Do NOT change the organization/team name in WorkOS
- Do NOT modify settings unrelated to visual branding (page settings, custom CSS, etc.)
- Never block the rest of the workflow on this step — if anything fails, fall back to manual instructions
- This step is best-effort — logo upload is optional, colors are the priority

## Phase 5: Summary

After all edits are applied, present a summary:

```markdown
## Branding Applied: {Company Name}

**Accent Color**: {radix_color} (matched from {brand_hex})
**Logo**: {logo_url}
**Demo App Path**: {demoAppPath}

### Files Modified
- `.env.local` (or `.env`) — Updated ACCENT_COLOR and PROSPECT_LOGO
- `brand-config.json` — Generated prospect-specific content configuration
- `src/app/favicon.ico` — Browser-tab favicon regenerated from prospect logo (32x32 PNG)
- `.brand-cache/{slug}.json` — Cached brand assets for future use

### Content Generated
- Hero: "{hero.heading}"
- Features: 4 prospect-tailored feature cards
- Trust: Enterprise compliance stats
- Dashboard: Personalized welcome with template variables

### AuthKit Dashboard
{If dashboard branding was applied: "Dashboard branding updated: button + link colors set to {brand_hex}. Logo uploaded: {yes/no}."}
{If Chrome tools unavailable or automation failed: "Manual update needed at https://dashboard.workos.com/branding — set button background + links to {brand_hex}"}
{If skipped: "Dashboard branding skipped — update manually at https://dashboard.workos.com/branding if needed"}

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
| Env file missing entirely | Create `.env.local` (Next.js/Vite) or `.env` and write vars |
| Env file missing expected variables | Append new lines rather than replacing |
| Notion MCP unavailable | Skip Notion storage silently, continue |
| Cache file corrupted/unreadable | Delete it, proceed with fresh research |
| User not logged into WorkOS dashboard | Prompt them to log in, offer to skip |
| Chrome MCP tools unavailable | Fall back to manual instructions with branding values and dashboard URL |
| Chrome branding page doesn't load | Retry once, then fall back to manual instructions |
| Logo upload JS fetch fails (CORS) | Skip logo, note in summary for manual upload |
| Color fields not found in read_page | Fall back to manual instructions |
| Save button click doesn't navigate | Retry click, then fall back to manual instructions |

## Critical Constraints

- **Always read files before editing** — the demo app may have been previously branded
- **Never guess brand colors** — use researched hex values or ask the user
- **Preserve env file structure** — only modify uncommented ACCENT_COLOR and PROSPECT_LOGO lines in `.env.local` (Next.js/Vite) or `.env` (others)
- **Don't modify component files or page.tsx** — all page content is driven by brand-config.json
- **Write complete configs** — always write every field in brand-config.json, never partial
- **Use only valid icon names** — see the icon reference in Phase 4c
- **Don't restart the dev server** — just remind the user to do it
- **Use the Edit tool** for env file changes — use the Write tool for `brand-config.json` and new env files
- **Never require manual env edits** — always write env vars autonomously, creating the file if needed
- **Cache brand research** — always persist to `.brand-cache/` after research and check cache before researching
- **Notion is best-effort** — store brand assets on Wiz-Kid deal pages when available, skip silently when not
