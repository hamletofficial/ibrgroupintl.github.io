# hamlet for Windows (development scaffold)

This folder contains the initial Electron desktop application scaffold. It is deliberately separate from the GitHub Pages website and does not change the production website.

## Current scope

- Opens the live Hamlet platform in a dedicated desktop window.
- Uses Electron context isolation, sandboxing, disabled Node.js integration and HTTPS navigation controls.
- Routes ordinary HTTPS links to the default browser.
- Provides a narrowly scoped `window.hamletDesktop.notify({ title, body })` bridge for Windows notifications.
- Generates a simple Hamlet-branded `.ico` at build time without an additional image dependency.
- Defines an NSIS installer build that creates Start menu and desktop shortcuts.

## Requirements

- Windows 10/11 development machine (recommended for building and testing the Windows installer).
- Node.js 24 LTS or another currently supported Node.js release compatible with the selected Electron tooling.
- npm.

## Build and test on Windows

From this directory:

```powershell
npm install
npm run check
npm start
npm run pack:win
```

The build generates `icon.ico` and should produce `release/hamlet-Setup-0.1.0.exe` after a successful Windows build.

## Important release work still required

1. Test Firebase sign-in flows, including Google, Facebook, LinkedIn, X and Apple, in Electron. Authentication popups and callback handling may require provider-specific adjustments.
2. Integrate the notification bridge with Hamlet's authorised reminder/event workflow; the bridge alone does not subscribe to Firestore or schedule reminders.
3. Add application icon assets and verify the final branding.
4. Configure signed releases and a secure update mechanism.
5. Run Windows installation, upgrade, uninstall, accessibility and security tests.
6. Confirm supported Windows versions and complete release review before public distribution.

Never place Firebase Admin credentials, service-account keys or other privileged secrets in this desktop package. Authorisation must remain enforced by the backend.
