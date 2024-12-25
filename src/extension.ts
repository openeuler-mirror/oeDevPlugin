/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import "reflect-metadata";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, commands, type ExtensionContext, workspace } from "vscode";
import { registerControllers } from "cec-client-server/decorator";
import { VueBoilerplatePanel } from "./panels/VueBoilerplatePanel";
import { MyTreeDataProvider } from './panels/MyTreeDataProvider';
import { WebviewApiController, setExtensionContextForWebviewService, webviewRouterChangeEmitter } from "./service/webview-service";

// init
registerControllers([WebviewApiController]);
const cfg = workspace.getConfiguration('openeuler_vscode_plugin');
if (!cfg.get('target_folder')) {
  cfg.update('target_folder', `${process.env.HOME || process.env.USERPROFILE}/openeuler_repos`.replace(/\\/g, '/'), true);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  setExtensionContextForWebviewService(context);
  window.registerTreeDataProvider('openeuler_plugin_expolerTreeView', new MyTreeDataProvider());

  const showPageCommand = commands.registerCommand(
    "openeuler_vscode_plugin.pageShow",
    (routePage: string) => {
      const oldVal = context.globalState.get('initialWebviewPage');
      if (routePage !== oldVal) {
        context.globalState.update('initialWebviewPage', routePage);
        webviewRouterChangeEmitter.fire(routePage);
      }
      VueBoilerplatePanel.render(context.extensionUri);
    }
  );
  const showClonePageCommand = commands.registerCommand(
    "openeuler_vscode_plugin.showClonePage",
    () => commands.executeCommand('openeuler_vscode_plugin.pageShow', 'Clone')
  );

  context.subscriptions.push(showPageCommand, showClonePageCommand);
}

// This method is called when your extension is deactivated
export function deactivate(context: ExtensionContext) {
  context.globalState.update('initialWebviewPage', '');
}
