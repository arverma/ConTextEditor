# Chrome Web Store publish checklist

Use this when submitting **ConText Editor Tab** to the Chrome Web Store.

## Package

```bash
npm run package
```

This builds the extension and writes `context-editor-tab-v<version>.zip` at the
repo root. Upload that zip in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Listing fields (suggested)

| Field | Value |
| --- | --- |
| **Name** | ConText Editor Tab |
| **Summary** (132 chars max) | Open a persistent Monaco editor tab so Gemini in Chrome can read your notes via @ tab context. |
| **Description** | See below |
| **Category** | Productivity |
| **Language** | English |
| **Privacy policy URL** | `https://arverma.github.io/ConTextEditor/privacy.html` |
| **Homepage** (optional) | `https://arverma.github.io/ConTextEditor/` |
| **Support URL** (optional) | `https://github.com/arverma/ConTextEditor` |

### Description (paste)

```
ConText Editor Tab opens a Monaco-powered text editor in a normal browser tab.
Write scratch notes or prompts, then use Gemini in Chrome’s “@” tab-context
picker to share that tab as context — no copy-paste required.

How it works
• Click the toolbar icon to open or re-focus your editor tab
• Your notes autosave in the browser (localStorage) on this device
• The editor is a static page on GitHub Pages so Gemini can see a normal https tab
  (chrome-extension:// pages are not available in that picker)

Privacy
• No account, no sync server, no note content uploaded by this app
• See the privacy policy linked on this listing
```

## Single purpose

Declare a single purpose along the lines of:

> Opens a dedicated text/code editor tab that AI tab-context tools (e.g. Gemini
> in Chrome) can read.

## Permission justification (`tabs`)

> Used only to find an existing ConText Editor tab, focus it, or open the known
> editor URL. The extension does not read or modify other sites.

## Screenshots

Prepare at least one of:

- **1280 × 800** or **640 × 400** PNG/JPEG

Suggested shots: editor with a sample note; theme toggle; Gemini @ picker with
the ConText Editor tab visible (if allowed by store policy for UI chrome).

## Icons

Store listing also needs a **128×128** icon (already in `public/icons/icon-128.png`).

## After upload

1. Complete the privacy practices questionnaire (no remote code, no user data
   collected/sold; notes stay in browser storage only).
2. Submit for review.
3. After approval, install from the store and confirm the icon opens
   `https://arverma.github.io/ConTextEditor/`.
