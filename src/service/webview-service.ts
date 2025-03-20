/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2.
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import { commands, env, workspace, EventEmitter, Uri } from 'vscode';
import type { ExtensionContext, Webview } from 'vscode';
import { CecServer } from 'cec-client-server';
import { controller, callable, getControllers, subscribable } from 'cec-client-server/decorator';
import { VueBoilerplatePanel } from '../panels/VueBoilerplatePanel';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { isOpenEuler, runRpmBuildScript } from '../utils/utils';

let extensionContext: ExtensionContext | undefined;

export function setExtensionContextForWebviewService(context: ExtensionContext) {
  extensionContext = context;
}

export const webviewRouterChangeEmitter = new EventEmitter<string>();

@controller('WebviewApi')
export class WebviewApiController {
  constructor() { }

  // @callable() ==> @callable('WebviewApi.getPersonalAccessToken'),
  // maps to client.call('WebviewApi.getPersonalAccessToken', ...args)
  @callable()
  async getPluginCfg() {
    const cfg = workspace.getConfiguration('openeuler_vscode_plugin');
    return {
      personalAccessToken: cfg.get('personal_access_token') || '',
      targetFolder: cfg.get('target_folder') || '',
    };
  }

  @callable()
  updatePluginCfg(cfgKey: string, cfgVal: string) {
    workspace.getConfiguration('openeuler_vscode_plugin').update(cfgKey, cfgVal || '', true);
  }

  @callable()
  openExternal(url: string) {
    if (url) {
      env.openExternal(Uri.parse(url));
    }
  }

  // 获取用户打开webview前点击的左侧节点对应哪个页面，需要在用户点击时更新该方法返回的变量值
  @callable()
  getCurrentRoute() {
    return extensionContext?.globalState.get('initialWebviewPage') || '';
  }
  // webview用来监听点击左侧节点后切换页面的事件
  @subscribable()
  getRouteForSubscribe(next: (value: any) => void) {
    const disposable = webviewRouterChangeEmitter.event(value => {
      next(value || '');
    });
    if (VueBoilerplatePanel.currentPanel) {
      VueBoilerplatePanel.currentPanel.addDisposables([disposable]);
    }
    return disposable.dispose.bind(disposable);
  }

  // webview端调用克隆仓库
  @callable()
  async doCloneRepo(ownerSlashRepo: string, branch: string, currentPath: string) {
    // 如果是异步的逻辑，可以await异步逻辑结束后return
    const msg = await gitPullOpetation(ownerSlashRepo, branch, currentPath);
    return {
      suc: msg === '克隆仓库成功！',
      msg
    };
  }

  @callable()
  checkInOpenEuler() {
    return isOpenEuler();
  }

  @callable()
  async cloneAndRunRpmbuild(ownerSlashRepo: string, branch: string) {
    const res = {
      suc: false,
      msg: '未知错误'
    };
    const repoFolder = workspace.getConfiguration('openeuler_vscode_plugin')?.get('target_folder');
    if (!repoFolder) {
      res.msg = '获取工作文件夹路径失败，请检查vscode插件配置';
      return res;
    }
    let repoName = ownerSlashRepo;
    if (repoName.endsWith('.git')) {
      repoName = repoName.slice(0, -4);
    }

    const repoLocation = path.join(repoFolder as string, repoName);
    const msg = await gitPullOpetation(ownerSlashRepo, branch, repoFolder as string);
    if (msg !== '克隆仓库成功！') {
      res.msg = `本地构建克隆仓库失败：${msg || '未知错误'}`;
      return res;
    }

    const rpmbuildMsg = runRpmBuildScript(repoLocation, branch);
    res.suc = rpmbuildMsg === 'suc';
    if (!res.suc) {
      res.msg = `本地构建运行失败：${rpmbuildMsg || '未知错误'}`;
      return res;
    }
    res.msg = '运行成功，请在打开的“本地构建”终端中查看';
    return res;
  }

  //前端在此调用打开文件夹操作
  @callable()
  async doOpenInFolder(ownerSlashRepo: string, branch: string, currentPath: string) {
    return await openInFolder(ownerSlashRepo, branch, currentPath);
  }

  @callable()
  async openInIde(repoUrl: string, branch: string, currentPath: string) {
    try {
      const repoName = repoUrl.replace('.git', '');
      const cloneDir = path.join(currentPath, repoName || 'default_repo');
      if (fs.existsSync(cloneDir)) {
        commands.executeCommand('vscode.openFolder', Uri.file(cloneDir));
        return;
      } else {
        await runGitCommand(`git clone -b ${branch} https://gitee.com/${repoUrl}.git ${cloneDir}`, cloneDir);
        commands.executeCommand('vscode.openFolder', Uri.file(cloneDir));
        return;
      }
    } catch (error) {
      return '在VS-CODE 打开失败';
    }
  }
  @callable()
  async doCopyUrl(url: string) {
    env.clipboard.writeText(url);
    return '已复制到剪切板';
  }

  @callable()
  async checkRepoStatus(repoPath: string) {
    try {
      // 检查路径是否存在
      if (!fs.existsSync(repoPath)) {
        return false;
      }

      // 检查是否是git仓库
      const gitDir = path.join(repoPath, '.git');
      if (!fs.existsSync(gitDir)) {
        return false;
      }


      // 检查是否有未提交修改
      const output = await new Promise<string>((resolve, reject) => {
        exec('git status --porcelain', { cwd: repoPath }, (error, stdout) => {
          error ? reject(error) : resolve(stdout);
        });
      });

      return true;
    } catch (error) {
      return {
        suc: false,
        msg: `仓库状态检查失败: ${error instanceof Error ? error.message : error}`,
        data: { exists: false, hasChanges: false }
      };
    }
  }

  @callable()
  async getModifiedFiles(repoName: string) {
    try {
      const repoFolder = workspace.getConfiguration('openeuler_vscode_plugin')?.get('target_folder');
      if (!repoFolder) {
        return [];
      }

      const cleanRepoName = repoName.replace('.git', '');
      const repoPath = path.join(repoFolder as string, cleanRepoName);
      console.info(`repoPath = ${repoPath}`);
      // 获取详细修改文件列表
      const output = await new Promise<string>((resolve, reject) => {
        exec('git status --porcelain', { cwd: repoPath }, (error, stdout) => {
          error ? reject(error) : resolve(stdout);
        });
      });
      // 解析git状态输出
      const modifiedFiles = output
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
          // 处理重命名情况：R  file1 -> file2
          const parts = line.slice(3).split(' -> ');
          return parts.length > 1 ? parts[1] : parts[0];
        });
      console.info(`modifiedFiles=${modifiedFiles}`);
      return modifiedFiles;

    } catch (error) {
      return {
        suc: false,
        msg: `获取修改文件失败: ${error instanceof Error ? error.message : error}`,
        data: { modifiedFiles: [] }
      };
    }
  }

  @callable()
  async commitFiles(repo: string, filePaths: string[], commitMessage: string) {
    try {
      // Validate parameters
      if (!filePaths?.length || !commitMessage?.trim()) {
        return 'Invalid parameters: file paths and commit message cannot be empty';
      }
      
      const targetFolder = workspace.getConfiguration('openeuler_vscode_plugin')?.get('target_folder');
      if (!targetFolder) {
        return 'Target folder not configured';
      }
      
      const repoFolder = path.join(targetFolder as string, repo);
      if (!fs.existsSync(repoFolder)) {
        return `Repository folder does not exist: ${repoFolder}`;
      }

      // Git add files
      await new Promise<void>((resolve, reject) => {
        exec(`git add ${filePaths.map(p => `"${p}"`).join(' ')}`, { 
          cwd: repoFolder 
        }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`git add failed: ${stderr || error.message}`));
          } else {
            resolve();
          }
        });
      });

      // Git commit
      const result = await new Promise<string>((resolve, reject) => {
        exec(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
          cwd: repoFolder
        }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`git commit failed: ${stderr || error.message}`));
          } else {
            resolve('Commit successful');
          }
        });
      });

      return result;

    } catch (error) {
      return `Error during commit: ${error instanceof Error ? error.message : error}`;
    }
  }
  @callable()
  async configPersonalAccessToken(accessToken: string) {
    const cmd = `oegitext config -token ${accessToken}`;
    return await runOeGitExtCommand(cmd);
  }
  @callable()
  async forkRepo(user: string, repo: string, path: string) {
    const cmd = `oegitext fork -user ${user} -repo ${repo} -path ${path}`;
    return await runOeGitExtCommand(cmd);
  }
  @callable()
  async getForkedRepos() {
    const cmd = `oegitext show proj`;
    return await runOeGitExtCommand(cmd);
  }
  @callable()
  async createPullRequest(user: string, repo: string, head: string, base: string, title: string, body: string) {
    const cmd = `oegitext pull -cmd create -user ${user} -repo ${repo} -head ${head} -base ${base} -title ${title} -body ${body}`;
    return await runOeGitExtCommand(cmd);
  }
  @callable()
  async mergePullRequest(user: string, repo: string, PRNumber: number) {
    const cmd = `oegitext pull -cmd merge -user ${user} -repo ${repo} -number ${PRNumber}`;
    return await runOeGitExtCommand(cmd);
  }
  @callable()
  async closePullRequest(user: string, repo: string, PRNumber: number) {
    const cmd = `oegitext pull -cmd close -user ${user} -repo ${repo} -number ${PRNumber}`;
    return await runOeGitExtCommand(cmd);
  }
  @callable()
  async openPullRequest(user: string, repo: string, PRNumber: number) {
    const cmd = `oegitext pull -cmd open -user ${user} -repo ${repo} -number ${PRNumber}`;
    return await runOeGitExtCommand(cmd);
  }
}
export function bindWebviewApi(webview: Webview) {
  const cecServer = new CecServer(
    webview.postMessage.bind(webview),
    webview.onDidReceiveMessage.bind(webview)
  );
  const { callables, subscribables } = getControllers();
  Object.entries(callables).map((item) => cecServer.onCall(...item));
  Object.entries(subscribables).map((item) => cecServer.onSubscribe(...item));
}

async function openInFolder(repoUrl: string, branch: string, currentPath: string) {
  try {
    const repoName = repoUrl.replace('.git', '');
    const cloneDir = path.join(currentPath, repoName || 'default_repo');
    if (fs.existsSync(cloneDir)) {
      return await openFolder(cloneDir, cloneDir);
    } else {
      fs.mkdirSync(cloneDir, { recursive: true });
      if (branch) {
        await runGitCommand(`git clone -b ${branch} https://gitee.com/${repoUrl}.git ${cloneDir}`, cloneDir);
        return await openFolder(cloneDir, cloneDir);
      }
      else {
        return '请选择分支';
      }

    }
  } catch (error) {
    console.error('打开文件夹失败');
    return '打开文件夹失败';
  }
}

function openFolder(folderPath: string, cwd: string) {
  const platform = process.platform;
  let command: string;
  if (platform === 'win32') {
    command = `start explorer.exe ${folderPath}`;
  } else if (platform === 'darwin') {
    command = `open ${folderPath}`;
  } else if (platform === 'linux') {
    command = `nautilus ${folderPath}`;
  } else {
    return `不支持的操作系统: ${platform}`;
  }

  exec(command, { cwd }, (error) => {
    if (error) {
      console.error(`Error executing filefolder command: ${error.message} `);
      return `打开文件夹失败`;
    } else {
      path.resolve();
      return `已打开文件夹`;
    }
  });
}

async function gitPullOpetation(repoUrl: string, branch: string, currentPath: string): Promise<string> {

  try {
    const repoName = repoUrl.replace('.git', '');
    const cloneDir = path.join(currentPath, repoName || 'default_repo');
    if (!branch) {
      return '请选择分支';
    }

    if (!fs.existsSync(cloneDir)) {
      fs.mkdirSync(cloneDir, { recursive: true });
    }
    const isRepoExist = fs.existsSync(path.join(cloneDir, '.git'));
    if (isRepoExist) {
      await runGitCommand(`git pull origin ${branch}`, cloneDir); // 执行 git pull
    } else {
      await runGitCommand(`git clone -b ${branch} https://gitee.com/${repoUrl}.git ${cloneDir}`, cloneDir);
    }

    return '克隆仓库成功！';
  } catch (error) {
    return `Error during Git operation` + error;
  }
}

function runGitCommand(command: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, _, stderr) => {
      if (error) {
        reject(`Error executing git command: ${stderr || error.message}`);
        return;
      }
      resolve();
    });
  });
}

async function runOeGitExtCommand(command: string) {
  let err = '';
  let out = '';
  let errNum = '';
  await new Promise<void>(res => {
    exec(`${command}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        err = 'Error during Git operation';
        const code = error.message.match(/status code: (\d+)/);
        const message = error.message.match(/"message":"([^"]+)"/);
        console.info(`code = ${code} message = ${message}`);
        stdout = message ? message[1] : '';
        stderr = code ? code[1] : '';
        res();
      }
      if (stderr) {
        console.error(`Error during Gitee operation: ${stderr}`);
        err = 'Error during Gitee operation';
        res();
      }
      out = stdout;
      errNum = stderr;
      res();
    });
  });
  return JSON.stringify({
    err, out, errNum,
  });
}
