import * as vscode from 'vscode';
import { DbEditorProvider } from './dbEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(DbEditorProvider.register(context));
}

export function deactivate() {}
