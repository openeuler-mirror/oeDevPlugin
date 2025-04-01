/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import { defineStore } from 'pinia'
import { usePluginCfgStore } from './pluginCfg';
import { httpRequest } from '@/utils/request';

interface RepoInfo {
  owner: string;
  repo: string;
  ownerSlashRepo: string;
}

export const useOeReposStore = defineStore('oeRepos', {
  state: () => ({
    repoInfoList: [] as RepoInfo[],
    // 用于从pr/issue页跳转至“我的repo”时临时储存目标repo名称（ownerSlashRepo）
    toRepoTarget: ''
  }),

  actions: {
    async reqRepoInfoList() {
      const auth = usePluginCfgStore().personalAccessToken;
      if (!auth) {
        return;
      }
      const res = [] as RepoInfo[];
      const resp = await httpRequest(`repos/openeuler/community/git/trees/master?access_token=${auth}&recursive=1`).catch(() => {});
      const list = resp?.tree || [];
      for (let i = 0; i < list.length; i++) {
        const element = list[i];
        const path = element.path || '';
        if (!path.endsWith('.yaml')) {
          continue;
        }
        let owner;
        if (path.includes('/openeuler/')) {
          owner = 'openeuler';
        } else if (path.includes('/src-openeuler/')) {
          owner = 'src-openeuler';
        } else {
          continue;
        }
        const repo = path.split('/').pop().slice(0, -5);
        res.push({
          owner,
          repo,
          ownerSlashRepo: `${owner}/${repo}`
        });
      }
      this.repoInfoList = res;
    },

    async getRepoInfoList() {
      if (this.repoInfoList.length === 0) {
        await this.reqRepoInfoList();
      }
      return this.repoInfoList;
    },

    setToRepoTarget(ownerSlashRepo: string) {
      this.toRepoTarget = ownerSlashRepo || '';
    }
  },
});