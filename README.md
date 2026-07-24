# cold-cart-landing

The landing site for the Cold Cart app — plain static HTML, no build step.
Deployed to Cloudflare Pages from this repo (`main` branch, output directory `/`).

## Structure

```
/                 English pages (default + fallback for every country)
  index.html      Landing page
  privacy.html    Privacy Policy
  terms.html      Terms of Use
  support.html    Support & contact
/pl/              Polish translations   (same four filenames)
/uk/              Ukrainian translations (same four filenames)
/assets/          Shared by ALL locales — edit once, applies everywhere
  landing.css     Landing page styles
  landing.js      Landing page behaviour (strings live in HTML data-* attrs)
  legal.css       Legal/support page styles
  locales.js      Locale registry + language switcher (renders into #langSwitch)
```

Conventions that keep localization cheap:

- **Same filenames in every locale folder** — relative links (`privacy.html`) stay inside the current locale automatically.
- **Assets referenced with absolute paths** (`/assets/...`) — locale pages share one copy.
- **No user-visible strings in JS** — the waitlist form messages come from `data-msg-invalid` / `data-msg-ok` attributes on the form, so each locale's HTML carries its own strings.
- English at `/` is the `x-default` — countries without a translation just use the root URLs (this is what most App Store locales point to).

## Adding a language (e.g. German, code `de`)

1. Copy the four root pages into `/de/` and translate the visible text.
   Change `<html lang="en">` → `lang="de"` and the `canonical` URL to the `/de/...` one.
   Keep hreflang links, asset paths, relative links, and all markup identical.
2. Add one entry to the array in `assets/locales.js`:
   `{ code: 'de', label: 'Deutsch', path: 'de' }`
   — the language switcher on every page updates automatically.
3. Add one `hreflang` line to the `<head>` of **each** page (all locales):
   `<link rel="alternate" hreflang="de" href="https://coldcart.win/de/PAGE">`
4. In App Store Connect, add the German localization and point its privacy policy
   URL at `https://coldcart.win/de/privacy.html`.

Translated legal pages carry a "the English version prevails" note under the
last-updated date — keep it in new translations.

## Local preview

```
python3 -m http.server 8000
```

Absolute `/assets/` paths require serving from the repo root (as above) — opening
the files directly via `file://` won't load styles.
