/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import type { usePluginCfgStore } from '../store/modules/pluginCfg';

export function openAccessTokenPrompt(cfgStore: ReturnType<typeof usePluginCfgStore>) {
  return ElMessageBox.prompt('配置Gitee私人令牌', '私人令牌', {
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    customClass: 'common-confirm',
    inputPattern: /^[a-f0-9]{32}$/,
    inputErrorMessage: '私人令牌字符串格式不正确',
    inputPlaceholder: '请输入Gitee私人令牌',
    inputValue: cfgStore.personalAccessToken || ''
  }).then(({ value }) => {
    if (value) {
      return cfgStore.updatePersonalAccessTokenCfg(value).then(() => value);
    }
    return value;
  }).catch(() => {
    /*canceled*/
  });
};

export function getRouteNameFromExtensionMsg(msg: string) {
  return msg?.split('#')[0] || '';
}
