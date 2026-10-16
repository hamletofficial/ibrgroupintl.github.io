# hamlet for Windows 0.1.0 — Beta 1

## What’s included

- A dedicated Windows desktop application that opens the live Hamlet platform.
- Hamlet-branded Windows installer with Start menu and desktop shortcuts.
- Native Windows notification support for Hamlet critical-path reminders, with browser notifications as a fallback.
- Electron security controls including context isolation, sandboxing, disabled Node.js integration and HTTPS navigation restrictions.
- Automated syntax, security and packaging checks before publication.
- A SHA-256 checksum file published alongside the installer so the downloaded package can be verified.

## Download and install

1. Download `hamlet-Setup-0.1.0.exe` and `SHA256SUMS.txt` from the Assets section of this release.
2. In PowerShell, run `Get-FileHash .\hamlet-Setup-0.1.0.exe -Algorithm SHA256`.
3. Compare the displayed hash with the installer entry in `SHA256SUMS.txt`. Do not install if they differ.
4. Run the installer and review any Windows security or publisher prompts before proceeding.
5. Launch Hamlet for Windows and sign in with your usual Hamlet account.

## Beta limitations and security

- This is a beta release; verify installation, sign-in, notifications, upgrade and uninstall behaviour on your own Windows device.
- Native reminders are currently page-driven. The Hamlet pipeline must be running for reminder checks; reminders are not scheduled while the application is fully closed.
- The installer is not yet code-signed. Do not bypass Windows security warnings simply because the file is labelled Hamlet.
- Secure automatic updates are not yet configured. Install future versions only from the official Hamlet GitHub Releases page and verify each release's checksum.
- A successful automated build does not replace real-device acceptance testing with your account and enabled sign-in providers.

## Feedback

For installation or usage assistance, visit the [Hamlet Support Centre](https://support.hamlet-ai.co.uk/).
