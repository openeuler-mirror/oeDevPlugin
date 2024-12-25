/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { window, type ExtensionContext } from 'vscode';
import { SCRIPT_CONTENT_MAP } from './scripts';

const SHELL_PREFIX = 'oe_vscode_ext_script_';

export function isOpenEuler() {
  const rel = (os.release() || '').toLowerCase();
  return rel.includes('.oe');
}

function checkScriptExist(context: ExtensionContext, scriptName: string) {
  const fileName = `${SHELL_PREFIX}${scriptName}`;
  const extensionPath = context.extensionPath;
  const scriptLocation = path.join(extensionPath, fileName);
  let msg = '';
  if (!fs.existsSync(scriptLocation)) {
    const fileContent = SCRIPT_CONTENT_MAP.get(scriptName);
    if (!fileContent) {
      msg = '脚本内容获取失败';
      return msg;
    }
    try {
      fs.writeFileSync(scriptLocation, fileContent, { mode: 0o755 });
    } catch (err) {
      msg = `创建脚本文件失败: ${err}`;
    }
  }
  return msg;
}

export function runRpmBuildScript(context: ExtensionContext, repoLocation: string, repoBranch: string) {
  // 尝试在扩展目录中查找脚本
  const extensionPath = context.extensionPath;
  const fileName = `${SHELL_PREFIX}rpmbuild-dev`;
  const scriptLocation = path.join(extensionPath, fileName);
  try {
    const checkExistMsg = checkScriptExist(context, 'rpmbuild-dev');
    if (checkExistMsg) {
      return checkExistMsg;
    }
    if (!fs.existsSync(scriptLocation)) {
      return '脚本加载失败：未找到文件';
    }
    // Create a terminal and run the script
    const terminal = window.createTerminal('本地构建');
    terminal.sendText(`sudo "${scriptLocation}" -r "${repoLocation}" -b "${repoBranch}"`);
    terminal.show();
    return 'suc';
  } catch (error) {
    return `脚本运行失败：${error}`;
  }
}
