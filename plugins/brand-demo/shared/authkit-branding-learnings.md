# AuthKit Dashboard Branding — Learnings Log

Captured from the Stripe branding session on 2026-04-14.

## What Worked

1. **`form_input` on visible light-mode hex fields** — Setting hex text inputs (placeholder="Hex color") via `form_input` + `Return` worked perfectly for light mode fields. Values saved correctly on the first try.

2. **`find` tool for locating elements** — More reliable than parsing `read_page` output. Queries like "Button background dark mode text input with placeholder Hex color" returned the exact ref needed.

3. **`scroll_to` for offscreen elements** — Brought hidden sidebar fields into view reliably.

4. **Direct navigation** — `navigate` to `dashboard.workos.com/branding/edit?preview=authkit` loaded the edit page directly without needing to click "Edit branding" first. Saves one interaction.

5. **Save detection** — After clicking "Save changes", the page navigates from `/branding/edit` to `/branding` (view mode). Checking the URL after a wait confirms save success.

6. **JavaScript `fetch` + `DataTransfer` for logo upload** — The most reliable logo upload method. Fetches the image URL via JS, creates a `File` object, assigns it to file inputs via `DataTransfer`, and dispatches a `change` event. Works for logo icon (idx 0), logo (idx 2), and favicon (idx 4). Logo and logo icon trigger crop modals; favicon may not trigger a crop modal if the source image is already square. Successfully uploaded Stripe logo to all three slots.

7. **Favicon upload can silently fail in batch** — When uploading to all 3 file inputs ([0, 2, 4]) in a single JS call, the favicon (idx 4) sometimes doesn't persist even though the JS reports success. The crop modals for logo (idx 2) and logo icon (idx 0) may interrupt processing of the favicon change event. **Fix**: After saving, verify all 3 slots on the view page. If favicon is stale, re-upload to just index 4 in a separate JS call and save again.

8. **Favicon has a strict 1:1 aspect-ratio validator with no auto-crop** (2026-04-14, YouTube test) — The favicon input enforces 1:1 and does NOT open a crop modal like logo/logo icon. Uploading a non-square image (e.g., YouTube's 512x358 SVG) displays "Image aspect ratio should be 1:1" in the UI; the Save operation then silently drops the file even if the preview image appears correct. Re-uploading a square PNG to the same input after an aspect-ratio error may not clear the error state because React holds the validation failure. **Fix**: ALWAYS render the logo onto a 512x512 white canvas before uploading to the favicon input, regardless of source dimensions. Never attempt to upload the raw logo to the favicon input. After upload, scan the DOM for the "Image aspect ratio should be 1:1" error string before saving; if present, re-run the canvas-pad script. After save, reload the edit page and verify the favicon preview has a non-placeholder src.

## What Failed

### Dark mode inputs are DISABLED when appearance = "Light"
- **Discovery**: All odd-indexed hex inputs (dark mode) have `disabled=true` when "Preferred appearance" is set to Light
- **Impact**: `form_input`, `type`, and even JavaScript `nativeInputValueSetter` all fail silently on disabled inputs
- **Resolution**: Don't attempt to set dark mode colors when appearance is Light. Only set them when appearance is "Auto" or "Dark"
- **Detection**: Check input disabled state before attempting to set values

### `upload_image` fails with "Unable to access message history"
- **Scenario**: Took a screenshot of the logo in tab B, tried to upload to a file input in tab A
- **Error**: "Unable to access message history to retrieve image"
- **Likely cause**: Screenshot IDs may not persist across tool call rounds, or cross-tab image references aren't supported
- **Workaround**: Use JavaScript `fetch` + `DataTransfer` + `File` API instead (see "What Worked" #6). This bypasses the MCP tool entirely and works reliably.

### `form_input` doesn't trigger React state changes on non-visible/disabled inputs
- **Scenario**: Used `form_input` on dark mode hex inputs that were disabled
- **Behavior**: DOM value changed but React state didn't update, Save button stayed disabled
- **Root cause**: Inputs were disabled (Light appearance mode)
- **Learning**: Always check if inputs are disabled before trying to set values

### `read_page(filter: "interactive")` doesn't return all elements
- **Scenario**: Only returned elements up to ref_46 (4 color pairs) when there are 8
- **Behavior**: Button text and Links fields were missing from the output
- **Likely cause**: The interactive filter may limit by viewport visibility or element count
- **Workaround**: Use `find` tool to locate specific elements by description, or use `read_page(filter: "all")` with a ref_id focus

## Optimization Recommendations for SKILL.md

### 1. Check appearance mode first
Before setting dark mode colors, check the "Preferred appearance" combobox value:
- If "Light" — only set light mode fields (indices 0, 2, 4, 6)
- If "Dark" — only set dark mode fields (indices 1, 3, 5, 7)
- If "Auto" — set all fields

### 2. Use `find` tool instead of parsing `read_page`
The `find` tool with natural language queries is more reliable:
```
find("Button background light mode text input with placeholder Hex color")
find("Links light mode text input with placeholder Hex color")
find("Save changes button")
```

### 3. Use `form_input` + Return for light mode, skip disabled dark mode
The `form_input` → `key("Return")` pattern works for enabled inputs. Don't waste tool calls on disabled fields.

### 4. Use JS fetch+DataTransfer for logo upload
The `upload_image` MCP tool fails cross-tab. Instead, use `javascript_tool` to fetch the logo URL, create a File via DataTransfer, and assign to file inputs (indices 0, 2, 4 for light mode). Each triggers a crop modal — click "Save changes" on each.

### 5. Minimum tool calls for color-only update
Optimal sequence (light mode only, appearance = Light):
```
1. tabs_context_mcp        — get/create tab
2. navigate                — go to /branding/edit?preview=authkit
3. wait(2s)                — page load
4. find("Button bg light") — get ref for button bg
5. form_input + Return     — set button bg
6. find("Links light")     — get ref for links
7. form_input + Return     — set links
8. find("Save changes")    — get save button ref
9. click Save              — save changes
10. wait(2s)               — confirm navigation
```
**10 tool calls total. ~20 seconds.**

### 6. Consider using JavaScript for bulk color updates
The `nativeInputValueSetter` approach works for setting DOM values on ENABLED inputs. Combine with React event dispatch for form dirty state:
```js
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
nativeInputValueSetter.call(input, newValue);
input.dispatchEvent(new Event('input', { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
```
This could set ALL color fields in a single JS call, reducing to ~6 tool calls total.

## Timing Results

| Step | Tool Calls | Time |
|------|-----------|------|
| Navigate + wait | 2 | ~3s |
| Find + set Button bg (light) | 2 | ~2s |  
| Find + set Links (light) | 2 | ~2s |
| Find + click Save + wait | 3 | ~4s |
| Dark mode debugging (wasted) | ~15 | ~60s |
| **Total (optimized)** | **~10** | **~15s** |
| **Total (actual with debugging)** | **~35** | **~3min** |

The optimized path is dramatically faster than the old child `claude --chrome` process approach.
