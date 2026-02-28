# Anteckningar

A minimalist desktop notes application built with Electron. Features a clean dark UI with cross-platform support for macOS and Windows.

---

## Features

- Create, edit and delete notes with title, date/time and body text
- Pin notes to keep important ones at the top of the list
- Export notes to PDF with a single click
- Auto-updater - Windows version updates automatically on launch
- Keyboard shortcut - Cmd+S / Ctrl+S to save
- Splash screen on launch
- Notes stored locally as plain text files on your machine

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Electron 29 | Desktop app framework |
| electron-builder | Cross-platform packaging (.dmg / .exe) |
| electron-updater | Automatic updates |
| Vanilla JS, HTML, CSS | UI and logic |
| Node.js fs | Local file storage |
| GitHub Actions | Automated CI/CD builds |

---

## Project Structure

notes-app/
- .github/workflows/build.yml - Builds Mac and Windows on every release tag
- renderer/index.html - Main UI
- renderer/app.js - UI logic and state
- renderer/splash.html - Splash screen shown on launch
- renderer/styles/tokens.css - Design tokens, colors, spacing, typography
- renderer/styles/layout.css - App layout and sidebar
- renderer/styles/components.css - All component styles
- renderer/styles/print.css - PDF export styles
- main.js - Electron main process and IPC handlers
- preload.js - Secure context bridge for IPC
- package.json - Config, scripts and build settings
- notesIcon.icns - App icon for macOS
- notesIcon.png - App icon for Windows

---

## Getting Started

Requirements: Node.js 20+

Install dependencies: npm install
Start in development mode: npm start

---

## Building and Releasing

Releases are handled automatically via GitHub Actions when a version tag is pushed.

Steps to release a new version:
1. Update the version in package.json
2. Upload all changed files to GitHub
3. Go to Releases and create a new release with a matching tag, e.g. v1.2.0
4. GitHub Actions builds .dmg for macOS and .exe for Windows automatically, takes about 5 minutes
5. Download installers from Actions then Artifacts

Version numbering convention:
- Bug fix: 1.1.3 to 1.1.4
- New feature: 1.1.3 to 1.2.0
- Major rebuild: 1.1.3 to 2.0.0

---

## Notes Storage

Notes are saved as plain .txt files in the system user data directory.

macOS: ~/Library/Application Support/Anteckningar/notes/
Windows: %APPDATA%\Anteckningar\notes\

Each note file uses this format:
DATUM: 2026-02-28T08:00
RUBRIK: My note title

Note body text here...

---

## Auto-Updates

Windows: Automatic - checks for updates 3 seconds after launch
macOS: Manual - download the latest .dmg from GitHub Releases

Note: macOS automatic updates require an Apple Developer certificate at $99 per year. Not implemented in this version.

---

## Known Limitations

- No code signing on macOS. A security warning appears on first launch. To bypass: right-click the app and choose Open.
- macOS build targets Intel x64 only.
- Auto-updates work on Windows only.

---

## Changelog

v1.1.3
- Pin notes to the top of the list
- Custom styled modal dialogs, replaced native OS popups
- App logo added to sidebar
- Save button updated to floppy disk icon
- Consistent input field styling across platforms, Windows fix

v1.1.2
- Fixed macOS build, now correctly targets Intel x64

v1.1.0
- Title field added to notes
- electron-updater integrated for automatic Windows updates

v1.0.0
- Initial release
