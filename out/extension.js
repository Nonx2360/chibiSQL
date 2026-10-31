"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const dbEditorProvider_1 = require("./dbEditorProvider");
function activate(context) {
    context.subscriptions.push(dbEditorProvider_1.DbEditorProvider.register(context));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map