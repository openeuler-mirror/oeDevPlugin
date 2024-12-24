/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import * as vscode from 'vscode';

function treeItemWithCommand(item: vscode.TreeItem, command: vscode.Command) {
  // deep clone needed
  item.command = {
    ...command,
    arguments: [...(command.arguments || [])]
  };
  return item;
}

export class MyTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      // 根节点
      return [
        new vscode.TreeItem("我的项目", vscode.TreeItemCollapsibleState.Collapsed),
        treeItemWithCommand(new vscode.TreeItem("我的Issue", vscode.TreeItemCollapsibleState.None), {
          title: '打开我的Issue',
          command: 'openeuler_vscode_plugin.pageShow',
          arguments: ['Issues']
        }),
        treeItemWithCommand(new vscode.TreeItem("我的PR", vscode.TreeItemCollapsibleState.None), {
          title: '打开我的PR',
          command: 'openeuler_vscode_plugin.pageShow',
          arguments: ['PullRequests']
        }),
        (() => {
          const tItem = new vscode.TreeItem("我的Repo", vscode.TreeItemCollapsibleState.Collapsed);
          tItem.contextValue = 'myRepoNode';
          return tItem;
        })()
      ];
    } else if (element.label === "我的项目") {
      // 我的项目的子节点
      return [
        treeItemWithCommand(new vscode.TreeItem("全部", vscode.TreeItemCollapsibleState.None), {
          title: '打开我的项目(全部)',
          command: 'openeuler_vscode_plugin.pageShow',
          arguments: ['MyRepos#all']
        }),
        treeItemWithCommand(new vscode.TreeItem("我创建的", vscode.TreeItemCollapsibleState.None), {
          title: '打开我的项目(我创建的)',
          command: 'openeuler_vscode_plugin.pageShow',
          arguments: ['MyRepos#mine']
        })
        // 暂时删除forks -- 目前无法通过接口参数过滤forks，获取全量仓库可能会导致查询很慢
        // treeItemWithCommand(new vscode.TreeItem("Forks", vscode.TreeItemCollapsibleState.None), {
        //   title: '打开我的项目(Forks)',
        //   command: 'openeuler_vscode_plugin.pageShow',
        //   arguments: ['MyRepos#forks']
        // })
      ];
    } else if (element.label === "我的Repo") {
      return [
        treeItemWithCommand(new vscode.TreeItem("openEuler", vscode.TreeItemCollapsibleState.None), {
          title: '打开我的Repo(openEuler)页面',
          command: 'openeuler_vscode_plugin.pageShow',
          arguments: ['Communitys#openeuler']
        }),
        treeItemWithCommand(new vscode.TreeItem("src-openEuler", vscode.TreeItemCollapsibleState.None), {
          title: '打开我的Repo(src-openEuler)页面',
          command: 'openeuler_vscode_plugin.pageShow',
          arguments: ['Communitys#src-openeuler']
        }),
        /*treeItemWithCommand(new vscode.TreeItem("其他", vscode.TreeItemCollapsibleState.None), {
          title: '打开我的项目(Forks)',
          command: 'openeuler_vscode_plugin.pageShow',
          arguments: ['Communitys#others']
        })*/
      ];
    }

    return [];
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }
}
