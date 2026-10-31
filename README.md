<div align="center">

  <img src="https://raw.githubusercontent.com/Nonx2360/chibiSQL/main/media/logo.png" width="180" height="180" alt="ChibiSQL Mascot Logo" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(247, 118, 142, 0.35);" />

  # ChibiSQL 🌸⚡
  ### The Anime-Themed SQLite Database Editor & Viewer for VS Code & Cursor

  <p align="center">
    A lightweight, zero-dependency SQLite viewer and custom editor extension powered by WebAssembly (WASM).<br/>
    Inspect tables, run queries, preview image BLOBs, and filter records with Tokyo Night anime aesthetics.
  </p>

  <p align="center">
    <a href="https://github.com/Nonx2360/chibiSQL/releases"><img src="https://img.shields.io/github/v/release/Nonx2360/chibiSQL?color=f7768e&label=version&style=flat-square" alt="Release Version" /></a>
    <a href="https://github.com/Nonx2360/chibiSQL/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-7dcfff?style=flat-square" alt="License: MIT" /></a>
    <a href="https://code.visualstudio.com/"><img src="https://img.shields.io/badge/VS%20Code-%5E1.80.0-bb9af7?style=flat-square&logo=visualstudiocode" alt="VS Code Compatibility" /></a>
    <a href="https://www.cursor.com/"><img src="https://img.shields.io/badge/Cursor-Compatible-9ece6a?style=flat-square" alt="Cursor Compatible" /></a>
    <a href="https://github.com/Nonx2360/chibiSQL/stargazers"><img src="https://img.shields.io/github/stars/Nonx2360/chibiSQL?color=e0af68&style=flat-square" alt="GitHub Stars" /></a>
  </p>

  <p align="center">
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-why-chibisql">Why ChibiSQL?</a> •
    <a href="#-keyboard-shortcuts">Shortcuts</a> •
    <a href="#-faq">FAQ</a> •
    <a href="#-contributing">Contributing</a>
  </p>

</div>

---

## 📖 Overview

**ChibiSQL** is a modern, anime-inspired SQLite GUI built directly into **VS Code**, **Cursor**, and **Antigravity IDE**. Powered entirely in-process by WebAssembly (`sql.js`), ChibiSQL eliminates the need for native C++ build tools, Python environments, or external database software like DB Browser for SQLite.

Whenever you open a `.db`, `.sqlite`, or `.sqlite3` file, ChibiSQL automatically intercepts the file via the VS Code Custom Editor API, presenting a fluid spreadsheet interface wrapped in a soothing Tokyo Night dark theme with cute anime mascot reactions.

---

## ✨ Features

- 🌸 **Tokyo Night Anime Interface:** A sleek developer UI inspired by Tokyo Night with reactive kaomoji status toasts (`(｡•̀ᴗ-)✧ Ready`, `(๑˃̵ᴗ˂̵) Loaded!`, `(>_<) Error`).
- ⚡ **Zero Native Dependencies:** Runs on pure WebAssembly via `sql.js`—no node-gyp, Python, or SQLite CLI installation required.
- 📂 **Instant File Association:** Automatically opens `.db`, `.sqlite`, and `.sqlite3` files with one click in the file tree.
- 🔍 **Interactive Multi-Level Filtering:**
  - **Inline Column Filters:** Dedicated per-column filter inputs (`Filter...`) with live 250ms debounced search.
  - **Global Table Search:** Search across all numeric and textual columns at once.
- 📑 **High-Performance Pagination:**
  - Fast SQL `LIMIT` & `OFFSET` queries handle large tables (100k+ rows) without freezing your editor.
  - Custom page size selector (`25`, `50`, `100`, `200` rows per page).
- 🔑 **Schema & Column Introspection:**
  - Visual type indicators: Primary Key (`🔑`), Numeric (`#`), Text (`🗎`), Date/Time (`📅`), and BLOB (`📦`).
  - 3-state column sorting (`ASC` ➔ `DESC` ➔ default).
- 🖼️ **BLOB & Image Previewer:**
  - Auto-detects image BLOB formats (PNG, JPEG, GIF, BMP, WebP) including Northwind OLE image headers.
  - Inline grid thumbnails and expanded preview in the inspector.
  - Native **Download BLOB** button to export binary payloads to disk.
- 🔎 **Row Inspector Modal:**
  - Click any record to inspect all fields in an organized modal view.
  - Traverse rows sequentially using keyboard shortcuts (<kbd>↑</kbd> and <kbd>↓</kbd>).
  - Quick-copy button on every cell and modal field.
- 💻 **Integrated SQL Query Console:**
  - Collapsible terminal drawer to run custom `SELECT`, `JOIN`, or aggregate queries with <kbd>Ctrl</kbd>+<kbd>Enter</kbd>.
  - Tracks query execution time in milliseconds (`⚡ 8ms`).

---

## 🚀 Quick Start

### Option 1: Install from VSIX (Recommended)

1. Download the latest `chibisql-x.x.x.vsix` release from [**GitHub Releases**](https://github.com/Nonx2360/chibiSQL/releases).
2. Open VS Code or Cursor.
3. Open the Extensions sidebar (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>X</kbd> or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>X</kbd>).
4. Click the **`...`** (More Actions) menu in the top-right corner.
5. Select **Install from VSIX...** and pick the downloaded `.vsix` file.
6. Click on any `.db` or `.sqlite` file in your workspace to launch ChibiSQL!

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/Nonx2360/chibiSQL.git
cd chibiSQL

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package as .vsix
npx @vscode/vsce package --no-git-tag-version
```

To debug locally in VS Code:
1. Open the repository folder in VS Code.
2. Press <kbd>F5</kbd> to launch the **Extension Development Host**.
3. Drag and drop any SQLite file into the new editor window.

---

## 💡 Why ChibiSQL?

| Feature | ChibiSQL 🌸 | Traditional SQLite Extensions | External GUI (DB Browser) |
| :--- | :---: | :---: | :---: |
| **Native Compilation Needed** | ❌ No (Pure WASM) | ⚠️ Often requires Python/C++ | ❌ Standalone App |
| **Integrated Inside VS Code / Cursor** | ✅ Yes | ✅ Yes | ❌ Requires App Switching |
| **Inline Image BLOB Previews** | ✅ Built-in | ❌ Rare | ⚠️ Separate window |
| **Per-Column Live Filtering** | ✅ Yes | ❌ Rare | ✅ Yes |
| **Tokyo Night Anime Theme** | 🌸 Yes (Iconic) | ❌ Standard Dark/Light | ❌ Desktop Native |
| **Lightweight Memory Footprint** | ✅ Minimal | ⚠️ Medium | ⚠️ Heavy |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> / <kbd>Cmd</kbd> + <kbd>Enter</kbd> | Run Custom Query | SQL Console |
| <kbd>↑</kbd> (Up Arrow) | View Previous Record | Row Detail Modal |
| <kbd>↓</kbd> (Down Arrow) | View Next Record | Row Detail Modal |
| <kbd>Esc</kbd> | Close Modal / Inspector | Row Detail Modal |
| <kbd>Click</kbd> on Cell | Open Row Detail Inspector | Data Grid |

---

## 🛠️ Tech Stack & Architecture

- **Runtime:** [VS Code Extension API](https://code.visualstudio.com/api) (Custom Readonly Editor Provider)
- **Engine:** [sql.js](https://sql.js.org/) (SQLite compiled to WebAssembly)
- **Frontend:** HTML5, Modern CSS, [Tailwind CSS](https://tailwindcss.com/)
- **Typography:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) & [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- **Icons:** Optimized SVG vectors with zero external font dependencies

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><strong>How does ChibiSQL open SQLite database files?</strong></summary>

ChibiSQL implements VS Code's `CustomReadonlyEditorProvider` to automatically register handlers for `*.db`, `*.sqlite`, and `*.sqlite3` file extensions. When opened, the binary contents are parsed client-side using `sql.js` (WebAssembly) in a sandboxed Webview without modifying your original file unless explicitly edited.
</details>

<details>
<summary><strong>Does ChibiSQL work in Cursor and Antigravity IDE?</strong></summary>

Yes! Because Cursor and Antigravity IDE are built upon the VS Code extension architecture, ChibiSQL works identically across all modern VS Code-compatible forks.
</details>

<details>
<summary><strong>Can ChibiSQL preview images stored in database BLOBs?</strong></summary>

Yes. ChibiSQL inspects binary header signatures to detect PNG, JPEG, GIF, BMP, and WebP data (including Northwind OLE image headers) and displays interactive thumbnails inside the table grid with a full-size preview and export button in the Row Inspector.
</details>

<details>
<summary><strong>Is ChibiSQL safe for large databases?</strong></summary>

ChibiSQL utilizes paginated queries (`LIMIT` and `OFFSET`) so that only the currently viewed page (default 50 rows) is rendered into the DOM, keeping rendering fast and memory consumption low even on tables with hundreds of thousands of records.
</details>

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project on [GitHub](https://github.com/Nonx2360/chibiSQL).
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) © 2026 Nonx2360.

---

<div align="center">
  <sub>Built with 💖 and Tokyo Night vibes by <a href="https://github.com/Nonx2360">Nonx2360</a>. If you like ChibiSQL, please give it a ⭐ on GitHub!</sub>
</div>
