
## Now you're in floder "chibisql"
## Project Blueprint & File Structure

```
chibisql/
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts
│   └── dbEditorProvider.ts
└── media/
    └── webview.html
```

## 1. Project Setup & Dependencies

Initialize a TypeScript project and install `sql.js` for WebAssembly-based SQLite handling without native C++ compilation:

  

Bash

```
mkdir chibisql && cd chibisql
npm init -y
npm install sql.js
npm install --save-dev typescript @types/vscode @types/node @types/sql.js vsce
```

### `tsconfig.json`

JSON

```
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "outDir": "out",
    "lib": ["ES2022"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

## 2. Extension Manifest (`package.json`)

Declare the Custom Editor contribution point to intercept `.db`, `.sqlite`, and `.sqlite3` file openings automatically:

  

JSON

```
{
  "name": "chibisql",
  "displayName": "ChibiSQL - Anime SQLite Editor",
  "description": "Anime-themed SQLite Database Reader & Editor for VS Code & Cursor",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": ["Other", "Data Science"],
  "main": "./out/extension.js",
  "activationEvents": [
    "onCustomEditor:chibisql.dbEditor"
  ],
  "contributes": {
    "customEditors": [
      {
        "viewType": "chibisql.dbEditor",
        "displayName": "ChibiSQL Editor",
        "selector": [
          { "filenamePattern": "*.db" },
          { "filenamePattern": "*.sqlite" },
          { "filenamePattern": "*.sqlite3" }
        ],
        "priority": "default"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "dependencies": {
    "sql.js": "^1.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/sql.js": "^1.8.0",
    "@types/vscode": "^1.80.0",
    "typescript": "^5.0.0"
  }
}
```

## 3. Extension Entry Point (`src/extension.ts`)

TypeScript

```
import * as vscode from 'vscode';
import { DbEditorProvider } from './dbEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(DbEditorProvider.register(context));
}

export function deactivate() {}
```

## 4. Custom Editor Provider (`src/dbEditorProvider.ts`)

Handles binary file loading with `sql.js`, query execution, and communication with the anime Webview UI:

  

TypeScript

```
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import initSqlJs, { Database } from 'sql.js';

export class DbEditorProvider implements vscode.CustomReadonlyEditorProvider {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(
            'chibisql.dbEditor',
            new DbEditorProvider(context),
            {
                webviewOptions: { retainContextWhenHidden: true },
                supportsMultipleEditorsPerDocument: false
            }
        );
    }

    constructor(private readonly context: vscode.ExtensionContext) {}

    async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
        return { uri, dispose: () => {} };
    }

    async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'media'))]
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        let db: Database | null = null;

        try {
            const SQL = await initSqlJs();
            const fileData = await vscode.workspace.fs.readFile(document.uri);
            db = new SQL.Database(fileData);
        } catch (err: any) {
            vscode.window.showErrorMessage(`ChibiSQL Error: Failed to open database (${err.message})`);
            return;
        }

        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            if (!db) return;

            switch (message.type) {
                case 'GET_TABLES': {
                    try {
                        const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
                        const tables = res.length > 0 ? res[0].values.map(row => row[0] as string) : [];
                        webviewPanel.webview.postMessage({ type: 'SET_TABLES', tables });
                    } catch (err: any) {
                        webviewPanel.webview.postMessage({ type: 'ERROR', message: err.message });
                    }
                    break;
                }

                case 'SELECT_TABLE': {
                    try {
                        const tableName = message.table;
                        const res = db.exec(`SELECT * FROM "${tableName}" LIMIT 200;`);
                        const columns = res.length > 0 ? res[0].columns : [];
                        const rows = res.length > 0 ? res[0].values : [];
                        webviewPanel.webview.postMessage({ type: 'SET_TABLE_DATA', table: tableName, columns, rows });
                    } catch (err: any) {
                        webviewPanel.webview.postMessage({ type: 'ERROR', message: err.message });
                    }
                    break;
                }

                case 'EXECUTE_QUERY': {
                    try {
                        const res = db.exec(message.query);
                        if (res.length === 0) {
                            webviewPanel.webview.postMessage({ type: 'QUERY_RESULT', columns: [], rows: [], affected: 0 });
                        } else {
                            webviewPanel.webview.postMessage({ type: 'QUERY_RESULT', columns: res[0].columns, rows: res[0].values });
                        }
                    } catch (err: any) {
                        webviewPanel.webview.postMessage({ type: 'ERROR', message: err.message });
                    }
                    break;
                }
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const htmlPath = path.join(this.context.extensionPath, 'media', 'webview.html');
        return fs.readFileSync(htmlPath, 'utf8');
    }
}
```

## 5. Anime Webview UI (`media/webview.html`)

A dark pastel theme inspired by Tokyo Night with Chibi status badges and interactive query controls:

  

HTML

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ChibiSQL</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #1a1b26; color: #a9b1d6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .pink-accent { color: #f7768e; }
        .cyan-accent { color: #7dcfff; }
        .purple-card { background-color: #24283b; border-color: #414868; }
        .glow-button { background: linear-gradient(135deg, #f7768e 0%, #bb9af7 100%); }
        .glow-button:hover { opacity: 0.9; box-shadow: 0 0 12px rgba(247, 118, 142, 0.4); }
    </style>
</head>
<body class="h-screen flex flex-col p-4 select-none">
    <!-- Header with Mascot Badge -->
    <header class="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
        <div class="flex items-center space-x-2">
            <span class="text-2xl">⚡</span>
            <h1 class="text-xl font-bold pink-accent">ChibiSQL <span class="text-xs text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full">v0.1 Desu~</span></h1>
        </div>
        <div id="statusBadge" class="text-xs px-3 py-1 rounded-full bg-slate-800 text-cyan-300 border border-cyan-500/30">
            (｡•̀ᴗ-)✧ Status: Ready
        </div>
    </header>

    <!-- Main Workspace Layout -->
    <div class="flex-1 flex space-x-4 overflow-hidden">
        <!-- Sidebar: Tables -->
        <aside class="w-1/4 purple-card border rounded-lg p-3 flex flex-col">
            <h2 class="text-sm font-semibold cyan-accent mb-2 uppercase tracking-wider">Tables List</h2>
            <div id="tableList" class="flex-1 overflow-y-auto space-y-1 text-sm">
                <div class="text-xs text-slate-500 italic">Loading tables...</div>
            </div>
        </aside>

        <!-- Main View: Grid & Query Console -->
        <main class="flex-1 flex flex-col space-y-3 overflow-hidden">
            <!-- Query Box -->
            <div class="purple-card border rounded-lg p-3 flex flex-col space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold pink-accent uppercase">Console Query</span>
                    <button onclick="runQuery()" class="glow-button text-slate-900 text-xs font-bold px-3 py-1 rounded shadow transition">Run Query (Ctrl+Enter)</button>
                </div>
                <textarea id="queryInput" rows="2" class="w-full bg-slate-900/80 border border-slate-700 rounded p-2 text-xs font-mono text-cyan-200 focus:outline-none focus:border-pink-400" placeholder="SELECT * FROM table..."></textarea>
            </div>

            <!-- Data Table View -->
            <div class="flex-1 purple-card border rounded-lg p-3 overflow-auto">
                <div id="dataContainer" class="text-xs font-mono">
                    <span class="text-slate-500">Select a table from the left sidebar to view contents.</span>
                </div>
            </div>
        </main>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const statusBadge = document.getElementById('statusBadge');
        const tableList = document.getElementById('tableList');
        const dataContainer = document.getElementById('dataContainer');

        vscode.postMessage({ type: 'GET_TABLES' });

        window.addEventListener('message', event => {
            const msg = event.data;
            switch (msg.type) {
                case 'SET_TABLES':
                    tableList.innerHTML = '';
                    if (msg.tables.length === 0) {
                        tableList.innerHTML = '<div class="text-xs text-slate-500">No tables found.</div>';
                    }
                    msg.tables.forEach(table => {
                        const btn = document.createElement('button');
                        btn.className = 'w-full text-left px-2 py-1.5 rounded hover:bg-purple-800/40 text-slate-200 transition font-mono text-xs';
                        btn.innerText = '🌸 ' + table;
                        btn.onclick = () => {
                            statusBadge.innerText = '(⁠*⁠_⁠*⁠) Fetching: ' + table;
                            vscode.postMessage({ type: 'SELECT_TABLE', table });
                        };
                        tableList.appendChild(btn);
                    });
                    statusBadge.innerText = '(｡•̀ᴗ-)✧ Status: Ready';
                    break;

                case 'SET_TABLE_DATA':
                case 'QUERY_RESULT':
                    statusBadge.innerText = '(๑˃̵ᴗ˂̵) Data Loaded!';
                    renderGrid(msg.columns, msg.rows);
                    break;

                case 'ERROR':
                    statusBadge.innerText = '(>_<) Query Error!';
                    dataContainer.innerHTML = `<div class="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300">Error: ${msg.message}</div>`;
                    break;
            }
        });

        function renderGrid(columns, rows) {
            if (!columns || columns.length === 0) {
                dataContainer.innerHTML = '<div class="text-slate-400">Query executed successfully. (No output returned)</div>';
                return;
            }
            let html = '<table class="min-w-full text-left border-collapse"><thead><tr>';
            columns.forEach(col => {
                html += `<th class="border-b border-slate-700 p-2 text-pink-300 font-bold bg-slate-900/40">${col}</th>`;
            });
            html += '</tr></thead><tbody>';
            rows.forEach(row => {
                html += '<tr class="border-b border-slate-800/60 hover:bg-slate-800/30">';
                row.forEach(val => {
                    html += `<td class="p-2 text-slate-300">${val !== null ? val : '<i class="text-slate-600">null</i>'}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
            dataContainer.innerHTML = html;
        }

        function runQuery() {
            const query = document.getElementById('queryInput').value;
            if (!query.trim()) return;
            statusBadge.innerText = '(⁠*⁠_⁠*⁠) Running Query...';
            vscode.postMessage({ type: 'EXECUTE_QUERY', query });
        }
    </script>
</body>
</html>
```

## 6. Testing & Building `.vsix`

1. **Compile TypeScript:**
    
      
    
    Bash
    
    ```
    npm run compile
    ```
    
2. **Local Debugging:**
    
      
    - Press **`F5`** inside VS Code to launch the **Extension Development Host**.
        
          
        
    - Drag any `.db` or `.sqlite` file into the editor sidebar and click to open it. It will launch ChibiSQL automatically.
        
          
        
3. **Package as `.vsix` Package:**
    
      
    
    Bash
    
    ```
    npx vsce package
    ```
    
4. **Install in Cursor / Antigravity IDE / VS Code:**
    
      
    - Open Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`).
        
          
        
    - Click **`...`** (top right) $\rightarrow$ **Install from VSIX...** $\rightarrow$ Select `chibisql-0.0.1.vsix`.