# AuthKit Dashboard Branding — Direct Chrome Automation

Reference for Phase 6 of the brand-demo skill. Instead of handing off to the user to manually use Claude in Chrome, automate dashboard branding directly using Claude Code's `mcp__claude-in-chrome__*` MCP tools.

## Why Direct Automation

- No public WorkOS API for branding — dashboard UI is the only path
- Dashboard uses Next.js server actions (form POST), not a callable REST/GraphQL endpoint
- Claude Code has full Chrome MCP tool access — navigate, form_input, upload_image, click
- Direct automation: ~10 tool calls, ~15 seconds vs manual handoff (minutes of user context-switching)

## Prerequisites

- User must be logged into `dashboard.workos.com` in Chrome
- Chrome extension (Claude in Chrome) must be running for MCP tools to work
- Brand assets (logo URL, hex color) must be resolved before starting

## Critical: Dark Mode Fields Are Disabled When Appearance = "Light"

When "Preferred appearance" is set to **Light**, all dark mode color inputs are **disabled** (`disabled=true`). Neither `form_input`, `type`, nor JavaScript can set values on disabled inputs. The form will not register changes.

**Rule**: Before setting color fields, check the appearance mode:
- **Light** (most common): Only set light mode fields (even indices: 0, 2, 4, 6). Skip dark mode entirely.
- **Dark**: Only set dark mode fields (odd indices: 1, 3, 5, 7).
- **Auto**: Set all fields.

The dark mode values visible on the branding view page are just stale previous values — they don't affect the auth UI when appearance is Light.

## Dashboard Branding Page Structure

**URL**: `https://dashboard.workos.com/branding/edit?preview=authkit`

### Tabs (top bar)
- AuthKit | Admin Portal | Emails

### Global Styles Panel (right sidebar)

**Dropdowns:**
| Field | Element | Values |
|-------|---------|--------|
| Preferred appearance | combobox | Light, Dark, Auto |
| Font family | label + suggestions button | Inter (default), system fonts |
| Box radius | combobox | Small, Medium, Large |
| Logo style | combobox | Logo icon, Logo, None |

**Image Uploads** (Light mode / Dark mode pairs):
| Asset | Light file input | Dark file input |
|-------|------------------|-----------------|
| Logo icon | file type button + Change/Clear | file type button + Change/Clear |
| Logo | file type button + Change/Clear | file type button + Change/Clear |
| Favicon | file type button + Change/Clear | file type button + Change/Clear |

**Color Fields** (hex text input + color picker pairs, Light/Dark):
| Field | Light hex input | Dark hex input |
|-------|----------------|----------------|
| Page background | `placeholder="Hex color"` | `placeholder="Hex color"` |
| Button background | `placeholder="Hex color"` | `placeholder="Hex color"` |
| Button text | `placeholder="Hex color"` | `placeholder="Hex color"` |
| Links | `placeholder="Hex color"` | `placeholder="Hex color"` |

**Important**: ref IDs are regenerated on every page load. Always use `read_page` or `find` to get current refs before interacting.

### Color Field Layout Pattern

Color fields appear in pairs (Light mode left, Dark mode right). Each pair has:
1. A hex text input (`placeholder="Hex color"`) — set values here
2. A native color picker input (`type="color"`) — ignore, used for visual preview

The order when reading interactive elements on the Global Styles tab is always:
```
Page background:   light_hex, light_color, dark_hex, dark_color
Button background: light_hex, light_color, dark_hex, dark_color
Button text:       light_hex, light_color, dark_hex, dark_color
Links:             light_hex, light_color, dark_hex, dark_color
```

To identify color fields: look for `textbox` elements with `placeholder="Hex color"`. They appear in groups of 8 pairs (16 total text inputs) — every odd-numbered hex input is Light mode, every even-numbered is Dark mode.

## Automation Steps

### Step 1: Get or Create Tab
```
mcp__claude-in-chrome__tabs_context_mcp(createIfEmpty: true)
```
Save the tabId. If existing tabs show the dashboard already open, reuse that tab.

### Step 2: Navigate to Branding Edit
```
mcp__claude-in-chrome__navigate(url: "https://dashboard.workos.com/branding/edit?preview=authkit", tabId: <tabId>)
```
Then wait 2 seconds for page load:
```
mcp__claude-in-chrome__computer(action: "wait", duration: 2, tabId: <tabId>)
```

### Step 3: Verify Login
Take a screenshot to confirm the edit page loaded (not a login redirect):
```
mcp__claude-in-chrome__computer(action: "screenshot", tabId: <tabId>)
```
If redirected to login, ask the user to log in and retry.

### Step 4: Find Form Elements Using `find`

**Prefer `find` over `read_page`** — the `find` tool with natural language queries is more reliable than parsing `read_page` output, which may truncate or miss offscreen elements.

```
find("Button background light mode text input with placeholder Hex color")  → ref for button bg
find("Links light mode text input with placeholder Hex color")              → ref for links
find("Save changes button")                                                  → ref for save
```

If you need to check appearance mode first:
```
find("Preferred appearance combobox")  → check current value (Light/Dark/Auto)
```

### Step 5: Set Brand Colors

For a typical brand update, set these color fields (the brand's primary hex color):

**Button background** (both light and dark):
```
mcp__claude-in-chrome__form_input(ref: "<button_bg_light_hex_ref>", value: "<BRAND_HEX_NO_HASH>", tabId: <tabId>)
mcp__claude-in-chrome__computer(action: "key", text: "Return", tabId: <tabId>)
mcp__claude-in-chrome__form_input(ref: "<button_bg_dark_hex_ref>", value: "<BRAND_HEX_NO_HASH>", tabId: <tabId>)
mcp__claude-in-chrome__computer(action: "key", text: "Return", tabId: <tabId>)
```

**Links** (both light and dark):
```
mcp__claude-in-chrome__form_input(ref: "<links_light_hex_ref>", value: "<BRAND_HEX_NO_HASH>", tabId: <tabId>)
mcp__claude-in-chrome__computer(action: "key", text: "Return", tabId: <tabId>)
mcp__claude-in-chrome__form_input(ref: "<links_dark_hex_ref>", value: "<BRAND_HEX_NO_HASH>", tabId: <tabId>)
mcp__claude-in-chrome__computer(action: "key", text: "Return", tabId: <tabId>)
```

**Important**: After setting each hex value via `form_input`, press Return to commit the value. The form uses React controlled inputs that need an explicit commit.

**Optional — Button text**: Usually leave as FFFFFF (white). Only change if brand color is very light.

**Optional — Page background**: Usually leave as default. Only change for full custom themes.

### Step 6: Upload Logo Icon and Logo

Use JavaScript `fetch` + `DataTransfer` + `File` API to programmatically upload the logo. This bypasses the `upload_image` MCP tool (which fails cross-tab with "Unable to access message history").

**CRITICAL**: Upload logo icon (index 0) and logo (index 2) first in one JS call, then upload favicon (index 4) **separately** after all crop modals are dismissed. Batching all 3 in one call causes the favicon upload to silently fail because the crop modals interrupt the change event processing.

**File input indices** (when `document.querySelectorAll('input[type="file"]')` is called):
- `[0]` = Logo icon, Light mode
- `[1]` = Logo icon, Dark mode
- `[2]` = Logo, Light mode
- `[3]` = Logo, Dark mode
- `[4]` = Favicon, Light mode
- `[5]` = Favicon, Dark mode

When appearance is "Light", only upload to light mode inputs (indices 0, 2, 4).

**Step 6a**: Upload to logo icon + logo via `javascript_tool`:
```javascript
(async () => {
  const logoUrl = '<LOGO_URL>';
  const response = await fetch(logoUrl);
  const blob = await response.blob();
  const file = new File([blob], 'brand-logo.png', { type: blob.type || 'image/png' });
  const fileInputs = document.querySelectorAll('input[type="file"]');
  // Only logo icon (0) and logo (2) — NOT favicon
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

**Step 6b**: Handle crop modals for logo and logo icon:
1. Take a screenshot to see the crop modal
2. Click "Save changes" on the modal (bottom-right of the modal)
3. Wait 1-2 seconds for the next modal
4. Repeat until all crop modals are dismissed (typically 2 modals: logo, then logo icon)

### Step 7: Upload Favicon (REQUIRED — do not skip)

The favicon input has two behaviors that differ from logo/logo icon:
1. **It enforces a strict 1:1 aspect ratio** — non-square uploads show "Image aspect ratio should be 1:1" and the Save operation silently drops the file.
2. **It does NOT open a crop modal** — the file must already be square.

**Always canvas-pad to 1:1 before uploading.** Do not upload the raw logo URL to the favicon input, even if the source looks square — pad defensively every time. This is the single most common silent-failure in the branding flow.

After all crop modals from Step 6 are dismissed, run:

```javascript
(async () => {
  const logoUrl = '<LOGO_URL>';
  const srcBlob = await (await fetch(logoUrl)).blob();
  // Render onto a 512x512 white canvas so output is always 1:1
  const img = new Image();
  const srcUrl = URL.createObjectURL(srcBlob);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = srcUrl; });
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 512, 512);
  const target = 480; // 16px padding on each side
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

Wait 2 seconds, then **verify before saving**:

```javascript
(() => {
  const errs = Array.from(document.querySelectorAll('*')).filter(el =>
    el.textContent === 'Image aspect ratio should be 1:1' && el.children.length === 0
  );
  return JSON.stringify({ aspectRatioErrors: errs.length });
})()
```

If `aspectRatioErrors > 0`, the upload did not commit — re-run the canvas-pad script. Do not proceed to save until the error is gone.

**Fallback**: If JS fetch fails (CORS, network error), note in summary for manual upload. The `upload_image` MCP tool is NOT recommended — it fails with cross-tab image references.

### Step 7b: Post-save verification

After clicking Save and the page navigates to `/branding`, re-navigate to `/branding/edit` and verify all three assets (logo icon [0], logo [2], favicon [4]) have non-placeholder preview images. The save path has a known failure mode where the favicon is silently dropped even though the preview showed the correct image pre-save. Always verify by reloading — never assume save-succeeded means favicon-persisted.

### Step 8: Save Changes

Scroll the save button into view and click:
```
mcp__claude-in-chrome__computer(action: "left_click", ref: "<save_button_ref>", tabId: <tabId>)
```
Wait for save to complete (page navigates to `/branding`):
```
mcp__claude-in-chrome__computer(action: "wait", duration: 2, tabId: <tabId>)
```

### Step 9: Verify Save
Take a screenshot to confirm the branding page shows updated values:
```
mcp__claude-in-chrome__computer(action: "screenshot", tabId: <tabId>)
```

## Identifying Color Field Refs from read_page Output

When `read_page(filter: "interactive")` returns the form, color fields appear after the image upload buttons. The pattern to find them:

1. Scroll through the interactive elements in the `tabpanel` region
2. After the last `"Clear"` button (for Favicon), the next elements are color fields
3. Color fields come in groups of 4 for each property: `hex_light`, `color_light`, `hex_dark`, `color_dark`
4. Only target the `textbox` elements with `placeholder="Hex color"` (skip the `type="color"` inputs)

**Mapping (in order of appearance):**
```
hex_input[0]  = Page background, Light mode
hex_input[1]  = Page background, Dark mode
hex_input[2]  = Button background, Light mode
hex_input[3]  = Button background, Dark mode
hex_input[4]  = Button text, Light mode
hex_input[5]  = Button text, Dark mode
hex_input[6]  = Links, Light mode
hex_input[7]  = Links, Dark mode
```

To extract: filter for all `textbox` elements with `placeholder="Hex color"`, then index into the resulting list.

## Error Handling

| Scenario | Action |
|----------|--------|
| Chrome extension not running | Fall back to manual prompt |
| Not logged into dashboard | Ask user to log in, offer to retry |
| Color field not found | Fall back to manual prompt |
| Save button click doesn't navigate | Retry click, or fall back to manual |
| Page takes too long to load | Increase wait duration, retry navigate |

## Timing Comparison

| Approach | Estimated Time | Tool Calls |
|----------|---------------|------------|
| Manual handoff (current) | 2-5 minutes (user switches apps, pastes prompt, waits) | 0 from Claude Code |
| Direct Chrome automation | 15-25 seconds | 8-12 |
| Headless browser / API | N/A — no public API exists | N/A |

## Notes

- The branding page applies to ALL environments in the workspace, not per-environment
- Admin Portal and Emails tabs have their own branding — this automation focuses on AuthKit only
- Custom CSS tab exists for advanced styling but is not needed for basic brand updates
- The `find` tool can locate elements by natural language (e.g., `find(query: "save changes button")`) as a fallback if `read_page` parsing is complex
