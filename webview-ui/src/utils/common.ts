/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import { h } from 'vue';
import type { usePluginCfgStore } from '../store/modules/pluginCfg';

export function openAccessTokenPrompt(cfgStore: ReturnType<typeof usePluginCfgStore>) {
  const currTkn = cfgStore.personalAccessToken || '';
  const renderMsgArr = [
    h('p', { style: 'font-size: 16px;' }, 'Gitee私人令牌'),
    h('p', { style: 'font-size: 12px; font-weight: bold; margin-top: 12px;' }, '需要该令牌有项目/Issue/PR/组织等权限以正常使用插件功能')
  ]
  if (currTkn) {
    renderMsgArr.push(h(
      'p',
      { style: 'font-size: 12px; margin-top: 6px; color: #f56c6c;' },
      `当前配置令牌: ${currTkn.slice(0, 4)}************************${currTkn.slice(-4)}`
    ))
  }
  return ElMessageBox.prompt(
    h('div', null, renderMsgArr),
    '配置私人令牌',
    {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      customClass: 'common-confirm',
      inputPattern: /(^[a-f0-9]{32}$)|(^\s*$)/,
      inputErrorMessage: '私人令牌字符串格式不正确',
      inputPlaceholder: '请输入Gitee私人令牌，留空则删除令牌',
      inputType: 'password',
      inputValue: cfgStore.personalAccessToken || ''
    }
  ).then(({ value }) => {
    const trimVal = (value || '').trim();
    return cfgStore.updatePersonalAccessTokenCfg(trimVal).then(() => trimVal);
  }).catch(() => {
    /*canceled*/
  });
};

export function getRouteNameFromExtensionMsg(msg: string) {
  return msg?.split('#')[0] || '';
}
