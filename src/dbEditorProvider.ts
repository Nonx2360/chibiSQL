import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Buffer } from 'buffer';
import initSqlJs, { Database } from 'sql.js';

interface ColumnMeta {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: any;
    pk: number;
}

interface TableSummary {
    name: string;
    rowCount: number;
}

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
        webviewPanel.iconPath = vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'logo.png'));
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'media'))]
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        let db: Database | null = null;

        const loadDatabase = async (): Promise<boolean> => {
            try {
                const SQL = await initSqlJs({
                    locateFile: (file) => path.join(this.context.extensionPath, 'node_modules', 'sql.js', 'dist', file)
                });
                const fileData = await vscode.workspace.fs.readFile(document.uri);
                db = new SQL.Database(fileData);
                return true;
            } catch (err: any) {
                vscode.window.showErrorMessage(`ChibiSQL Error: Failed to open database (${err.message})`);
                webviewPanel.webview.postMessage({ type: 'ERROR', message: `Failed to load database: ${err.message}` });
                return false;
            }
        };

        const success = await loadDatabase();
        if (!success || !db) return;

        const getTableList = (): TableSummary[] => {
            if (!db) return [];
            try {
                const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC;");
                if (res.length === 0) return [];
                const tableNames = res[0].values.map((row) => String(row[0]));
                const summaries: TableSummary[] = [];
                for (const name of tableNames) {
                    try {
                        const countRes = db.exec(`SELECT COUNT(*) FROM "${name}";`);
                        const count = countRes.length > 0 && countRes[0].values.length > 0 ? Number(countRes[0].values[0][0]) : 0;
                        summaries.push({ name, rowCount: count });
                    } catch {
                        summaries.push({ name, rowCount: 0 });
                    }
                }
                return summaries;
            } catch {
                return [];
            }
        };

        const getTableColumns = (tableName: string): ColumnMeta[] => {
            if (!db) return [];
            try {
                const res = db.exec(`PRAGMA table_info("${tableName}");`);
                if (res.length === 0) return [];
                const cols: ColumnMeta[] = [];
                for (const row of res[0].values) {
                    cols.push({
                        cid: Number(row[0]),
                        name: String(row[1]),
                        type: String(row[2] || '').toUpperCase(),
                        notnull: Number(row[3]),
                        dflt_value: row[4],
                        pk: Number(row[5])
                    });
                }
                return cols;
            } catch {
                return [];
            }
        };

        const formatCellValue = (val: any): any => {
            if (val === null || val === undefined) {
                return null;
            }
            if (val instanceof Uint8Array) {
                const u8 = val;
                const { mimeType, base64 } = this.processBlob(u8);
                return {
                    __isBlob: true,
                    size: u8.length,
                    mimeType,
                    base64
                };
            }
            return val;
        };

        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            if (!db && message.type !== 'RELOAD_DATABASE') return;

            switch (message.type) {
                case 'RELOAD_DATABASE': {
                    const loaded = await loadDatabase();
                    if (loaded) {
                        const tables = getTableList();
                        webviewPanel.webview.postMessage({ type: 'SET_TABLES', tables });
                    }
                    break;
                }

                case 'GET_TABLES': {
                    try {
                        const tables = getTableList();
                        webviewPanel.webview.postMessage({ type: 'SET_TABLES', tables });
                    } catch (err: any) {
                        webviewPanel.webview.postMessage({ type: 'ERROR', message: err.message });
                    }
                    break;
                }

                case 'SELECT_TABLE': {
                    try {
                        if (!db) return;
                        const tableName: string = message.table;
                        const page: number = Math.max(1, Number(message.page) || 1);
                        const pageSize: number = Math.min(500, Math.max(10, Number(message.pageSize) || 50));
                        const sortColumn: string | undefined = message.sortColumn;
                        const sortDirection: 'ASC' | 'DESC' = message.sortDirection === 'DESC' ? 'DESC' : 'ASC';
                        const columnFilters: Record<string, string> = message.columnFilters || {};
                        const globalFilter: string = (message.globalFilter || '').trim();

                        const columnsMeta = getTableColumns(tableName);
                        if (columnsMeta.length === 0) {
                            webviewPanel.webview.postMessage({
                                type: 'SET_TABLE_DATA',
                                table: tableName,
                                columns: [],
                                columnMeta: [],
                                rows: [],
                                page: 1,
                                pageSize,
                                totalRows: 0,
                                totalPages: 1
                            });
                            return;
                        }

                        // Build WHERE conditions
                        const whereClauses: string[] = [];

                        // Column filters
                        for (const [colName, filterVal] of Object.entries(columnFilters)) {
                            const trimmed = (filterVal || '').trim();
                            if (trimmed && columnsMeta.some(c => c.name === colName)) {
                                const escapedVal = trimmed.replace(/'/g, "''");
                                whereClauses.push(`"${colName}" LIKE '%${escapedVal}%'`);
                            }
                        }

                        // Global filter across all text/numeric columns
                        if (globalFilter) {
                            const escapedGlobal = globalFilter.replace(/'/g, "''");
                            const globalOrs = columnsMeta
                                .filter(c => !c.type.includes('BLOB'))
                                .map(c => `"${c.name}" LIKE '%${escapedGlobal}%'`);
                            if (globalOrs.length > 0) {
                                whereClauses.push(`(${globalOrs.join(' OR ')})`);
                            }
                        }

                        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

                        // Count total matching rows
                        let totalRows = 0;
                        try {
                            const countRes = db.exec(`SELECT COUNT(*) FROM "${tableName}" ${whereString};`);
                            totalRows = countRes.length > 0 && countRes[0].values.length > 0 ? Number(countRes[0].values[0][0]) : 0;
                        } catch (err: any) {
                            webviewPanel.webview.postMessage({ type: 'ERROR', message: `Count error: ${err.message}` });
                            return;
                        }

                        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
                        const safePage = Math.min(page, totalPages);
                        const offset = (safePage - 1) * pageSize;

                        // ORDER BY clause
                        let orderString = '';
                        if (sortColumn && columnsMeta.some(c => c.name === sortColumn)) {
                            orderString = `ORDER BY "${sortColumn}" ${sortDirection}`;
                        }

                        const query = `SELECT * FROM "${tableName}" ${whereString} ${orderString} LIMIT ${pageSize} OFFSET ${offset};`;
                        const res = db.exec(query);

                        const columns = res.length > 0 ? res[0].columns : columnsMeta.map(c => c.name);
                        const rawRows = res.length > 0 ? res[0].values : [];

                        const formattedRows = rawRows.map(row => row.map(cell => formatCellValue(cell)));

                        webviewPanel.webview.postMessage({
                            type: 'SET_TABLE_DATA',
                            table: tableName,
                            columns,
                            columnMeta: columnsMeta,
                            rows: formattedRows,
                            page: safePage,
                            pageSize,
                            totalRows,
                            totalPages,
                            sortColumn,
                            sortDirection
                        });
                    } catch (err: any) {
                        webviewPanel.webview.postMessage({ type: 'ERROR', message: err.message });
                    }
                    break;
                }

                case 'EXECUTE_QUERY': {
                    try {
                        if (!db) return;
                        const startTime = Date.now();
                        const res = db.exec(message.query);
                        const duration = Date.now() - startTime;

                        if (res.length === 0) {
                            webviewPanel.webview.postMessage({
                                type: 'QUERY_RESULT',
                                columns: [],
                                rows: [],
                                duration,
                                message: 'Query executed successfully. (No result set returned)'
                            });
                        } else {
                            const columns = res[0].columns;
                            const formattedRows = res[0].values.map(row => row.map(cell => formatCellValue(cell)));
                            webviewPanel.webview.postMessage({
                                type: 'QUERY_RESULT',
                                columns,
                                rows: formattedRows,
                                duration,
                                rowCount: formattedRows.length
                            });
                        }
                    } catch (err: any) {
                        webviewPanel.webview.postMessage({ type: 'ERROR', message: err.message });
                    }
                    break;
                }

                case 'DOWNLOAD_BLOB': {
                    try {
                        const filename = message.filename || 'blob.bin';
                        const base64 = message.base64;
                        const saveUri = await vscode.window.showSaveDialog({
                            defaultUri: vscode.Uri.file(filename),
                            saveLabel: 'Save BLOB Data'
                        });
                        if (saveUri) {
                            const buffer = Buffer.from(base64, 'base64');
                            await vscode.workspace.fs.writeFile(saveUri, buffer);
                            vscode.window.showInformationMessage(`ChibiSQL: Saved ${filename} successfully!`);
                        }
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Failed to save BLOB: ${err.message}`);
                    }
                    break;
                }
            }
        });
    }

    private processBlob(u8: Uint8Array): { mimeType: string | null; base64: string } {
        // PNG detection
        if (
            u8.length >= 8 &&
            u8[0] === 0x89 &&
            u8[1] === 0x50 &&
            u8[2] === 0x4e &&
            u8[3] === 0x47 &&
            u8[4] === 0x0d &&
            u8[5] === 0x0a &&
            u8[6] === 0x1a &&
            u8[7] === 0x0a
        ) {
            return { mimeType: 'image/png', base64: Buffer.from(u8).toString('base64') };
        }

        // JPEG detection
        if (u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
            return { mimeType: 'image/jpeg', base64: Buffer.from(u8).toString('base64') };
        }

        // GIF detection
        if (u8.length >= 6 && u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x38) {
            return { mimeType: 'image/gif', base64: Buffer.from(u8).toString('base64') };
        }

        // BMP detection
        if (u8.length >= 2 && u8[0] === 0x42 && u8[1] === 0x4d) {
            return { mimeType: 'image/bmp', base64: Buffer.from(u8).toString('base64') };
        }

        // WebP detection
        if (
            u8.length >= 12 &&
            u8[0] === 0x52 &&
            u8[1] === 0x49 &&
            u8[2] === 0x46 &&
            u8[3] === 0x46 &&
            u8[8] === 0x57 &&
            u8[9] === 0x45 &&
            u8[10] === 0x42 &&
            u8[11] === 0x50
        ) {
            return { mimeType: 'image/webp', base64: Buffer.from(u8).toString('base64') };
        }

        // OLE header check (e.g. Northwind sample database has a 78-byte OLE header prepended before BMP/JPEG)
        if (u8.length > 78) {
            if (u8[78] === 0x42 && u8[79] === 0x4d) {
                return { mimeType: 'image/bmp', base64: Buffer.from(u8.subarray(78)).toString('base64') };
            }
            if (u8[78] === 0xff && u8[79] === 0xd8 && u8[80] === 0xff) {
                return { mimeType: 'image/jpeg', base64: Buffer.from(u8.subarray(78)).toString('base64') };
            }
        }

        return { mimeType: null, base64: Buffer.from(u8).toString('base64') };
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const htmlPath = path.join(this.context.extensionPath, 'media', 'webview.html');
        const logoUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'logo.png')));
        let html = fs.readFileSync(htmlPath, 'utf8');
        return html.replace(/{{LOGO_URI}}/g, logoUri.toString());
    }
}
