"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbEditorProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const sql_js_1 = require("sql.js");
class DbEditorProvider {
    context;
    static register(context) {
        return vscode.window.registerCustomEditorProvider('chibisql.dbEditor', new DbEditorProvider(context), {
            webviewOptions: { retainContextWhenHidden: true },
            supportsMultipleEditorsPerDocument: false
        });
    }
    constructor(context) {
        this.context = context;
    }
    async openCustomDocument(uri) {
        return { uri, dispose: () => { } };
    }
    async resolveCustomEditor(document, webviewPanel) {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'media'))]
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
        let db = null;
        try {
            const SQL = await (0, sql_js_1.default)({
                locateFile: file => path.join(this.context.extensionPath, 'node_modules', 'sql.js', 'dist', file)
            });
            const fileData = await vscode.workspace.fs.readFile(document.uri);
            db = new SQL.Database(fileData);
        }
        catch (err) {
            vscode.window.showErrorMessage(`ChibiSQL Error: Failed to open database (${err.message})`);
            return;
        }
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            if (!db)
                return;
            switch (message.type) {
                case 'GET_TABLES': {
                    try {
                        const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
                        const tables = res.length > 0 ? res[0].values.map(row => row[0]) : [];
                        webviewPanel.webview.postMessage({ type: 'SET_TABLES', tables });
                    }
                    catch (err) {
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
                    }
                    catch (err) {
                        webviewPanel.webview.postMessage({ type: 'ERROR', message: err.message });
                    }
                    break;
                }
                case 'EXECUTE_QUERY': {
                    try {
                        const res = db.exec(message.query);
                        if (res.length === 0) {
                            webviewPanel.webview.postMessage({ type: 'QUERY_RESULT', columns: [], rows: [], affected: 0 });
                        }
                        else {
                            webviewPanel.webview.postMessage({ type: 'QUERY_RESULT', columns: res[0].columns, rows: res[0].values });
                        }
                    }
                    catch (err) {
                        webviewPanel.webview.postMessage({ type: 'ERROR', message: err.message });
                    }
                    break;
                }
            }
        });
    }
    getHtmlForWebview(webview) {
        const htmlPath = path.join(this.context.extensionPath, 'media', 'webview.html');
        return fs.readFileSync(htmlPath, 'utf8');
    }
}
exports.DbEditorProvider = DbEditorProvider;
//# sourceMappingURL=dbEditorProvider.js.map