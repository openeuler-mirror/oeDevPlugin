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

function treeItemWithCommand(item: vscode.TreeItem, command: vscode.Command, id?: string) {
  // deep clone needed
  item.command = {
    ...command,
    arguments: [...(command.arguments || [])]
  };
  if (id) {
    item.id = id;
  }
  return item;
}

const TREE_ITEMS_MAP: Readonly<Map<string, vscode.TreeItem>> = new Map([
  [
    'my_project', (() => {
      const tItem = new vscode.TreeItem("我的项目", vscode.TreeItemCollapsibleState.Collapsed);
      tItem.id = 'my_project';
      return tItem;
    })()
  ], [
    'my_issue', treeItemWithCommand(new vscode.TreeItem("我的Issue", vscode.TreeItemCollapsibleState.None), {
      title: '打开我的Issue',
      command: 'openeuler_vscode_plugin.pageShow',
      arguments: ['Issues']
    }, 'my_issue')
  ], [
    'my_pr', treeItemWithCommand(new vscode.TreeItem("我的PR", vscode.TreeItemCollapsibleState.None), {
      title: '打开我的PR',
      command: 'openeuler_vscode_plugin.pageShow',
      arguments: ['PullRequests']
    }, 'my_pr')
  ], [
    'send_pr', treeItemWithCommand(new vscode.TreeItem("提交PR", vscode.TreeItemCollapsibleState.None), {
      title: '提交PR',
      command: 'openeuler_vscode_plugin.pageShow',
      arguments: ['CreatePR']
    }, 'send_pr')
  ], [
    'my_repo', (() => {
      const tItem = new vscode.TreeItem("我的Repo", vscode.TreeItemCollapsibleState.Collapsed);
      tItem.id = 'my_repo';
      tItem.contextValue = 'myRepoNode';
      return tItem;
    })()
  ], [
    'my_project-all', treeItemWithCommand(new vscode.TreeItem("全部", vscode.TreeItemCollapsibleState.None), {
      title: '打开我的项目(全部)',
      command: 'openeuler_vscode_plugin.pageShow',
      arguments: ['MyRepos#all']
    }, 'my_project-all')
  ], [
    'my_project-mine', treeItemWithCommand(new vscode.TreeItem("我创建的", vscode.TreeItemCollapsibleState.None), {
      title: '打开我的项目(我创建的)',
      command: 'openeuler_vscode_plugin.pageShow',
      arguments: ['MyRepos#mine']
    }, 'my_project-mine')
  ], 
  // 暂时删除了forks -- 目前无法通过接口参数过滤forks，获取全量仓库可能会导致查询很慢
  // command arg is 'MyRepos#forks'
  [
    'my_repo-oe', treeItemWithCommand(new vscode.TreeItem("openEuler", vscode.TreeItemCollapsibleState.None), {
      title: '打开我的Repo(openEuler)页面',
      command: 'openeuler_vscode_plugin.pageShow',
      arguments: ['Communitys#openeuler']
    }, 'my_repo-oe')
  ], [
    'my_repo-src', treeItemWithCommand(new vscode.TreeItem("src-openEuler", vscode.TreeItemCollapsibleState.None), {
      title: '打开我的Repo(src-openEuler)页面',
      command: 'openeuler_vscode_plugin.pageShow',
      arguments: ['Communitys#src-openeuler']
    }, 'my_repo-src')
  ]
]);

const TREE_CHILDREN_MAP: Readonly<Map<string, string[]>> = new Map([
  ['my_project', ['my_project-all', 'my_project-mine']],
  ['my_repo', ['my_repo-oe', 'my_repo-src']]
]);

export class MyTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  static getTreeItemById(id: string) {
    return TREE_ITEMS_MAP.get(id);
  }

  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      // 根节点
      return [
        TREE_ITEMS_MAP.get('my_project')!,
        TREE_ITEMS_MAP.get('my_issue')!,
        TREE_ITEMS_MAP.get('my_pr')!,
        TREE_ITEMS_MAP.get('send_pr')!,
        TREE_ITEMS_MAP.get('my_repo')!
      ];
    }

    const childrenKeys = TREE_CHILDREN_MAP.get(element.id || '');
    if (!childrenKeys) {
      return [];
    }

    return childrenKeys.map(v => TREE_ITEMS_MAP.get(v)!);
  }

  getParent(element: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem> {
    const path = element.id?.split('-');
    if (!Array.isArray(path) || path.length < 2) {
      return;
    }
    path.pop();
    return TREE_ITEMS_MAP.get(path.pop()!);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }
}
