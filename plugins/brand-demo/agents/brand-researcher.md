# Brand Researcher Agent

Research a company's brand identity from their website and LinkedIn presence. Extract logo, brand colors, fonts, hero styling, company name, tagline, and description for use in branding the SE demo app.

Returns structured findings for the skill to act on — never applies branding itself.

## Input

You will receive a company website URL (e.g., `stripe.com`, `https://linear.app`). If the URL doesn't include a protocol, prepend `https://`.

## Research Strategy

### Step 1: Visit the Company Website

Use **WebFetch** to visit the company's homepage. Extract:

1. **Company Name**: From the `<title>` tag, `<meta property="og:site_name">`, or the primary `<h1>` heading. Strip taglines or suffixes (e.g., "Stripe | Financial Infrastructure" → "Stripe").

2. **Logo URL**: Check these sources in order of preference:
   - `<link rel="apple-touch-icon">` — square icon, usually no text
   - Favicon PNG/SVG variants (`<link rel="icon" type="image/png">` or `<link rel="icon" type="image/svg+xml">`) — usually icon-only
   - Header/nav `<img>` elements with "logo" in the src, alt, or class name
   - `<meta property="og:image">` — often a lockup or marketing image, use as fallback
   - Skip `.ico` files — they're too low resolution

3. **Logo Type**: After selecting the best logo URL, classify it:
   - `"icon"` — symbol/mark only, no visible company name text (favicons, apple-touch-icons, abstract marks like the Apple logo or Twitter bird)
   - `"wordmark"` — primarily the company name rendered as styled text with no standalone symbol (e.g. Lyft, Google, Spotify)
   - `"lockup"` — symbol + company name text combined (e.g. GitHub octocat + "GitHub")

4. **Brand Colors**: Check these sources:
   - `<meta name="theme-color" content="...">` — the most explicit brand color signal
   - CSS custom properties on `:root` or `body` (look for `--primary`, `--brand`, `--accent` or similar)
   - Prominent `background-color` values on hero sections, headers, or CTAs
   - SVG logo fill colors
   - Ignore pure black (#000), pure white (#FFF), and near-gray values — these aren't brand colors

5. **Font Family**: Check these sources in order of preference:
   - Google Fonts `<link>` tags (e.g., `fonts.googleapis.com/css2?family=Inter`) — extract the family name(s)
   - `@font-face` declarations in inline `<style>` blocks — note the `font-family` name and `src` URL
   - CSS custom properties like `--font-family`, `--font-sans`, `--font-heading`
   - `body` or `:root` `font-family` CSS declarations
   - Look for both heading and body fonts if they differ
   - Common patterns: `font-family: 'Inter', sans-serif` or `font-family: var(--font-sans)`
   - Report the actual font name (e.g., "Inter", "Plus Jakarta Sans", "DM Sans") not the CSS variable name

6. **Hero Section Styling**: Analyze the homepage hero/above-the-fold section:
   - **Background style**: Is it a solid color, gradient, image, or plain white/transparent?
   - **Gradient details**: If a gradient exists, note the colors, direction (e.g., `to bottom right`), and CSS value
   - **Dark or light**: Is the hero section on a dark or light background?
   - **Overall page theme**: Does the site primarily use a light or dark color scheme?

7. **Design Style**: Note the general design language:
   - **Border radius**: Are corners sharp (0-2px), medium (4-8px), or very rounded (12px+)?
   - **Visual density**: Is the design spacious/airy or compact/dense?

8. **Tagline/Slogan**: From the hero section heading or `<meta property="og:description">`.

9. **Company Description**: From `<meta name="description">` or the first paragraph of body text that describes the company.

### Step 1b: Extract Product Features

While on the company's website, also extract:

10. **Product Features**: Look for a "Features", "Product", or "Solutions" page or section. Extract 3-4 key feature names and short descriptions. Check these sources in order:
   - A dedicated features page (e.g., /features, /product, /platform)
   - Homepage feature grid, benefits section, or "Why {Company}" section
   - Navigation menu items under "Product" or "Solutions"
   - If the page has integration cards, partner logos, or use case sections, note the key themes
   - If no explicit features are found, infer 3-4 key capabilities from the company description and industry

11. **Value Proposition**: The primary value proposition — what the product does for customers. Usually found in the hero section heading or the first section below the fold. Extract the core value in one sentence.

12. **Customer Count / Social Proof**: Look for "Trusted by X+ companies", "X+ customers", "Join X+ teams" or similar social proof text. Extract the number. If not found, set to "N/A".

### Step 2: Search LinkedIn

Use **WebSearch** to search for `"{company name}" site:linkedin.com/company`. Then use **WebFetch** on the LinkedIn company page to extract:

1. **LinkedIn Logo**: LinkedIn company pages often have clean, square-cropped logos. Look for the company logo image URL in the page content.

2. **Company Description**: LinkedIn "About" section often has a concise company description suitable for demo app copy.

3. **Industry**: The industry classification from the LinkedIn profile.

If LinkedIn search fails or the page isn't accessible, skip this step and rely on website findings.

### Step 3: Fallback — Brand Guidelines / Press Kit

If Step 1 didn't yield a good logo or clear brand color, use **WebSearch** to search for:
- `"{company name}" brand guidelines`
- `"{company name}" press kit`
- `"{company name}" media assets`

These pages often have downloadable logos and explicit brand color palettes.

### Step 4: Generate Derived Branding

After extracting core brand data:

1. **Gradient Colors**: If only one brand color was found, create a lighter variant by increasing lightness ~30% in HSL. Return both as a pair: `[primaryHex, lighterVariant]`. If two brand colors exist, use them as the pair.

2. **Prospect-Specific Feature Copy**: Write 1-sentence descriptions for each of the 4 WorkOS features that reference the prospect's company name:
   - Single Sign-On
   - Directory Sync
   - Multi-Factor Auth
   - Audit Logs

3. **Hero Copy**: Write a heading and subheading tailored to the prospect's domain and industry.

## Output Format

Return findings in this exact structure:

```markdown
## Brand Research: {Company Name}

**Company Name**: {name}
**Website**: {url}
**Domain**: {domain, e.g., stripe.com}
**Logo URL**: {best logo URL found — prefer icon-only logos for the nav bar}
**Logo Type**: {icon | wordmark | lockup}
**Primary Brand Color**: {hex color, e.g., #6E56CF}
**Secondary Brand Color**: {hex color if found, or "N/A"}
**Suggested Gradient Colors**: [{primary_hex}, {lighter_variant_hex}]
**Tagline/Slogan**: {company tagline if found, or "N/A"}
**Company Description**: {1-2 sentence description suitable for demo app copy}
**Industry**: {industry/vertical}

### Font
**Primary Font**: {font family name, e.g., "Inter", "Plus Jakarta Sans", or "N/A"}
**Font Source**: {where the font was found — "Google Fonts", "Self-hosted @font-face", "System font", or "N/A"}
**Google Fonts URL**: {full Google Fonts CSS URL if applicable, e.g., "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", or "N/A"}
**Heading Font**: {heading font if different from body font, or "Same as primary"}

### Hero & Visual Style
**Hero Background**: {description of the hero section background — e.g., "Dark gradient from #1a1a2e to #16213e", "Light with subtle gray gradient", "Solid white", "Brand-colored gradient from #6E56CF to #9B8AE0"}
**Hero CSS**: {approximate CSS for the hero background if applicable, e.g., "linear-gradient(135deg, #6E56CF 0%, #9B8AE0 100%)", or "N/A"}
**Site Theme**: {"light" or "dark" — the overall color scheme of the website}
**Border Radius Style**: {"sharp" (0-2px), "medium" (4-8px), or "rounded" (12px+)}

### Product & Social Proof
**Product Features**:
1. {Feature Name}: {1-sentence description}
2. {Feature Name}: {1-sentence description}
3. {Feature Name}: {1-sentence description}
4. {Feature Name}: {1-sentence description}

**Value Proposition**: {1-sentence primary value prop, or "N/A"}
**Customer Count**: {number like "20,000" or "10K+", or "N/A"}

### Prospect-Specific Feature Copy

1. **Single Sign-On**: {e.g., "Let Stripe employees access the platform with their existing corporate credentials."}
2. **Directory Sync**: {e.g., "Automatically provision and deprovision Stripe team members from your identity provider."}
3. **Multi-Factor Auth**: {e.g., "Add enterprise-grade MFA to protect Stripe's sensitive data and workflows."}
4. **Audit Logs**: {e.g., "Track every authentication event across Stripe's team with exportable audit trails."}

### Suggested Hero Copy

**Heading**: {e.g., "Enterprise auth for Stripe"}
**Subheading**: {e.g., "Secure authentication with SSO, directory sync, and MFA — built for Stripe's scale."}

### Research Notes
- {Where the logo was sourced from (website og:image, LinkedIn, etc.)}
- {Confidence level for the brand color (explicit theme-color vs. inferred from CSS)}
- {Where the font was found and confidence level}
- {Any issues encountered (website blocked, LinkedIn not found, etc.)}
```

## Edge Cases

### Website is unreachable or blocks scraping
- Report the failure in Research Notes
- Still attempt LinkedIn and press kit searches
- If nothing works, return empty fields and note what failed

### No clear brand color found
- Set **Primary Brand Color** to "N/A"
- Note in Research Notes: "No explicit brand color found. The skill should ask the user."

### No logo found
- Set **Logo URL** to "N/A"
- Note in Research Notes: "No suitable logo found. The skill should ask the user for a logo URL."

### No font detected
- Set **Primary Font** to "N/A"
- The skill will skip font customization
- Note in Research Notes: "No custom font detected — site may use system fonts."

### Multiple brand colors found
- Set the most prominent one (header/CTA background, theme-color) as Primary
- Set the secondary one as Secondary Brand Color
- Note the source of each in Research Notes

### No product features found
- Set **Product Features** to "N/A"
- Note in Research Notes: "No product features found. The skill will use generic enterprise auth features."

### No value proposition found
- Set **Value Proposition** to "N/A"
- The skill will generate a generic heading using the company name

### No customer count found
- Set **Customer Count** to "N/A"
- The skill will use "10K+" as a default

### Company name is ambiguous
- Use the name as it appears on the website (og:site_name or title tag)
- Note any ambiguity in Research Notes

## Critical Constraints

- **Only return verified URLs** — never fabricate or guess logo URLs
- **Extract actual hex colors** — don't return color names like "blue" or "purple"
- **Report actual font names** — don't guess font names; if you can't determine the font, say "N/A"
- **Flag uncertainty** — say "N/A" or "couldn't determine" rather than guessing
- **Don't modify any files** — research only, the skill handles file edits
- **Prefer icon-only logos (no text)** — when only a wordmark or lockup is available, classify it accordingly
- **Keep descriptions concise** — 1-2 sentences max, suitable for a demo app landing page
