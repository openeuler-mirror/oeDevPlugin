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
import { useCall } from '@/utils/apiClient'
import { httpRequest } from '@/utils/request';

interface GiteeUserInfo {
  id?: number;
  login?: string;
  name?: string;
  avatar_url?: string;
}

export const usePluginCfgStore = defineStore('pluginCfg', {
  state: () => ({
    personalAccessToken: '',
    targetFolder: '',
    giteeUserInfo: {} as GiteeUserInfo,
    isVscodeInOpenEuler: false
  }),

  actions: {
    async updateCfgFromExtension() {
      const cfg: Record<string, string> = await useCall('WebviewApi.getPluginCfg');
      this.personalAccessToken = cfg?.personalAccessToken || '';
      this.targetFolder = cfg?.targetFolder || '';
      if (this.personalAccessToken) {
        await this.reqGiteeUserInfo();
      }
    },
    async updatePersonalAccessTokenCfg(cfgVal: string) {
      if (this.personalAccessToken === cfgVal) {
        return;
      }
      this.personalAccessToken = cfgVal;
      await useCall('WebviewApi.updateSecret', 'personal_access_token', cfgVal);
      await useCall('WebviewApi.configPersonalAccessToken', cfgVal);
      if (cfgVal === '') {
        this.giteeUserInfo = {};
      } else {
        await this.reqGiteeUserInfo();
      }
    },
    async reqGiteeUserInfo() {
      const res = await httpRequest('user').catch(() => { });
      if (res?.id) {
        this.giteeUserInfo = res;
      }
    },
    async checkVscodeInOpenEuler() {
      this.isVscodeInOpenEuler = await useCall('WebviewApi.checkInOpenEuler');
    }
  },
});
