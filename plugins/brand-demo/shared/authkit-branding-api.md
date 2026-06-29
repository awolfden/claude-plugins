# AuthKit Branding — WorkOS Branding REST API

Reference for Phase 6 of the brand-demo skill. Replaces the Chrome-automation
approach (`authkit-dashboard-branding.md`) with direct calls to the WorkOS
**branding REST API**. No browser, no login, no crop modals, no tab cleanup.

> **Internal-only API.** This surface is flag-gated (`branding-api`) and
> undocumented (`@ApiExcludeController`). It is fine to use for SE demo tooling;
> do not reference it in customer-facing material.

## Why this is better than Chrome automation

| Chrome approach | API approach |
| --- | --- |
| ~20 MCP tool calls, screenshots, waits | ~5 curl calls |
| Requires user logged into dashboard in Chrome | Requires only a secret API key |
| Indexed JS into `input[placeholder="Hex color"]` (breaks on UI change) | Typed JSON fields |
| Crop modals + 1:1 favicon canvas hacks | Pre-square locally, upload bytes |
| Tab cleanup required | Nothing to clean up |

## Prerequisites

1. **A WorkOS secret key for the demo environment** (`sk_...`). Prefer an env var
   over plaintext in `settings.json`:
   - `WORKOS_BRAND_DEMO_KEY` (recommended), or
   - `workosSecretKey` in `settings.json` (note: secret — keep the file gitignored).
2. **API base URL** — `https://api.workos.com` for production demos
   (`dashboard.workos.com`), `https://api.workos-test.com` for staging.
   Configurable as `workosApiBaseUrl` (default production).
3. **The `branding-api` flag must be enabled for *your* demo team.** It is keyed on
   the key's team in LaunchDarkly. Each SE self-services this once for the
   environment they demo with: in the **production** LD project (`default`) →
   `branding-api` flag → add **your team** as an **individual target → Enabled**.
   Do **not** change the Default rule to Enabled — all SEs share the one production
   LD environment, so that would turn the API on for every team. You need your
   **team ID** (`team_…`) to add the target. If a request returns `404`, the flag
   isn't targeting this key's team yet — surface that to the user (see Gotchas),
   don't treat it as a generic error.

`settings.json` additions:
```json
{
  "demoAppPath": "~/path/to/your/demo-app",
  "workosApiBaseUrl": "https://api.workos.com",
  "workosSecretKey": "sk_..."
}
```

## Endpoints

| Method & path | Purpose |
| --- | --- |
| `GET /branding` | Read current branding (verify gating + result) |
| `PATCH /branding` | Partial update of colors, theme, text, logo paths |
| `POST /branding/logo/upload-url` | Presign an S3 upload for one logo asset |

All are **environment-scoped to the key** — no path params; the key selects the
environment. `PATCH` is partial: only the fields you send change.

## Field mapping (dashboard concept → API field)

| Dashboard control | API field(s) | Values |
| --- | --- | --- |
| Button background | `lightButtonBackgroundColor`, `darkButtonBackgroundColor` | `#RRGGBB` |
| Button text | `lightButtonForegroundColor`, `darkButtonForegroundColor` | `#RRGGBB` |
| Links | `lightLinkColor`, `darkLinkColor` | `#RRGGBB` |
| Page background | `lightPageBackgroundColor`, `darkPageBackgroundColor` | `#RRGGBB` |
| Preferred appearance | `theme` | `Light` \| `Dark` \| `System` |
| Box radius | `radius` | `None` \| `Small` \| `Medium` \| `Large` \| `Full` |
| Logo style | `authkitLogoStyle` | `Icon` \| `Logo` \| `None` |
| Logo icon fit | `logoIconFit` | `Cover` \| `Contain` |
| Welcome heading | `authkitSignInHeadingText`, `authkitSignUpHeadingText` | string |
| Logo image | `lightLogoPath`, `darkLogoPath` | path from upload |
| Logo icon image | `lightLogoIconPath`, `darkLogoIconPath` | path from upload |
| Favicon image | `lightFaviconPath`, `darkFaviconPath` | path from upload |

Unlike the dashboard, the API lets you set light **and** dark values directly
regardless of `theme`, so set both (mirror the brand color into each) for a result
that looks right in any appearance.

## Logo upload — three-step flow per asset

The upload variants are: `lightLogo`, `darkLogo`, `lightLogoIcon`,
`darkLogoIcon`, `lightFavicon`, `darkFavicon`. Allowed content types:
`image/png`, `image/jpeg`, `image/gif`, `image/svg+xml`. Max size **1 MiB**.

1. **Presign**: `POST /branding/logo/upload-url` with `{ variant, contentType }`
   → `{ uploadUrl, uploadFields, path }`.
2. **Upload to S3**: multipart `POST` to `uploadUrl` with every entry of
   `uploadFields`, the file, **and a `Content-Type` field you add yourself**
   (see the bug note below). Success is HTTP `204`.
3. **Assign**: `PATCH /branding` setting the relevant `*Path` field(s) to the
   returned `path`.

> ### ⚠️ Known bug — you MUST add `Content-Type` yourself
> The presign response **strips the `Content-Type` field** from `uploadFields`
> (the response Zod schema in `s3-user-assets.service.ts` doesn't list it, so it's
> silently dropped). But the S3 policy **requires** it. If you POST only the
> returned `uploadFields`, S3 returns **403**. Always re-add
> `-F "Content-Type=<the contentType you presigned with>"` to the S3 POST. This is
> tracked for a one-line fix; until then the workaround below is mandatory.

Favicons: the API does not enforce 1:1 (that was a dashboard crop constraint), but
non-square favicons render poorly. Pre-square locally with `sips` before upload.

## Self-contained recipe (Bash)

```bash
# --- config ---
API="${workosApiBaseUrl:-https://api.workos.com}"
KEY="${WORKOS_BRAND_DEMO_KEY:?set WORKOS_BRAND_DEMO_KEY or workosSecretKey}"
AUTH="Authorization: Bearer $KEY"

# upload_asset <variant> <local-file> <content-type>  -> echoes the branding path
upload_asset() {
  local variant="$1" file="$2" ct="$3"
  local presign path url
  presign=$(curl -s -X POST "$API/branding/logo/upload-url" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"variant\":\"$variant\",\"contentType\":\"$ct\"}")
  path=$(printf '%s' "$presign" | python3 -c 'import json,sys;print(json.load(sys.stdin)["path"])')
  # Build the S3 POST: every returned field + the file + the REQUIRED Content-Type workaround.
  local code
  code=$(printf '%s' "$presign" | python3 - "$file" "$ct" <<'PY'
import json,sys,subprocess
p=json.load(sys.stdin); file=sys.argv[1]; ct=sys.argv[2]
args=["curl","-s","-o","/dev/null","-w","%{http_code}","-X","POST",p["uploadUrl"]]
for k,v in p["uploadFields"].items(): args+=["-F",f"{k}={v}"]
args+=["-F",f"Content-Type={ct}"]            # <-- bug workaround: policy requires this
args+=["-F",f"file=@{file};type={ct}"]
print(subprocess.run(args,capture_output=True,text=True).stdout.strip())
PY
)
  [ "$code" = "204" ] || { echo "S3 upload failed for $variant (HTTP $code)" >&2; return 1; }
  echo "$path"
}

# --- 1. colors / theme / text (single PATCH) ---
# BRAND_HEX e.g. "#6363F1"; BTN_TEXT "#FFFFFF" (or "#1A1A1A" for very light brands); COMPANY e.g. "Acme"
curl -s -X PATCH "$API/branding" -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"theme\": \"System\",
  \"radius\": \"Medium\",
  \"authkitLogoStyle\": \"Logo\",
  \"lightButtonBackgroundColor\": \"$BRAND_HEX\", \"darkButtonBackgroundColor\": \"$BRAND_HEX\",
  \"lightLinkColor\": \"$BRAND_HEX\", \"darkLinkColor\": \"$BRAND_HEX\",
  \"lightButtonForegroundColor\": \"$BTN_TEXT\", \"darkButtonForegroundColor\": \"$BTN_TEXT\",
  \"authkitSignInHeadingText\": \"Welcome to $COMPANY\",
  \"authkitSignUpHeadingText\": \"Create your $COMPANY account\"
}" >/dev/null

# --- 2. assets (logo + icon + favicon). Square the favicon first. ---
sips -s format png --padToHeightWidth 256 256 "$LOGO_FILE" --out /tmp/favicon-sq.png >/dev/null 2>&1

LOGO_PATH=$(upload_asset lightLogo      "$LOGO_FILE"        "$LOGO_CT")
ICON_PATH=$(upload_asset lightLogoIcon  "$ICON_FILE"        "$ICON_CT")
FAV_PATH=$(upload_asset  lightFavicon   /tmp/favicon-sq.png "image/png")

# --- 3. assign paths (mirror light -> dark) ---
curl -s -X PATCH "$API/branding" -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"lightLogoPath\": \"$LOGO_PATH\",         \"darkLogoPath\": \"$LOGO_PATH\",
  \"lightLogoIconPath\": \"$ICON_PATH\",     \"darkLogoIconPath\": \"$ICON_PATH\",
  \"lightFaviconPath\": \"$FAV_PATH\",       \"darkFaviconPath\": \"$FAV_PATH\"
}" >/dev/null

# --- verify ---
curl -s "$API/branding" -H "$AUTH" | python3 -m json.tool
```

Determine content type from the source file when the brand-researcher hands you a
URL/extension: `.svg`→`image/svg+xml`, `.png`→`image/png`, `.jpg`/`.jpeg`→`image/jpeg`,
`.gif`→`image/gif`, else `file --mime-type -b <file>`.

## Gotchas

- **403 on the S3 POST** → you forgot the `Content-Type` workaround field. It is
  required even though the presign omits it from `uploadFields`.
- **404 from any `/branding` call** → the `branding-api` flag isn't targeting this
  key's team. Ask the user to add **their team** as an individual target (Enabled)
  on the `branding-api` flag in **production** LaunchDarkly — not to change the
  Default rule (shared prod LD env; that would enable it for all teams). They need
  their `team_…` ID to add the target. Then retry. Don't report it as a generic
  failure.
- **400 "Logo path must belong to project …"** → only assign the exact `path`
  returned by the presign for this same key; paths are validated against the key's
  project and reject `..`.
- **Paths are not validated against S3** — `PATCH` stores whatever path string you
  give it. Only assign a path **after** its S3 upload returned `204`, or the logo
  silently won't render.
- **1 MiB limit** — downscale large source logos before upload.
- **Env scoping** — the key brands its own environment. Use the demo
  environment's key; there are no env/team params.
```
