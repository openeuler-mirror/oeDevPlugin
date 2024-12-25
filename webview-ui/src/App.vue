<!--
/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */
-->

<script setup lang="ts">
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import { usePluginCfgStore } from '@/store/modules/pluginCfg';
import { openAccessTokenPrompt } from '@/utils/common';

const locZh = zhCn as any;
const cfgStore = usePluginCfgStore();

// 默认黑暗模式
const htmlEl = document.getElementsByTagName('html')[0];
htmlEl.classList.add('dark');
htmlEl.setAttribute('theme', 'dark');

const isIniFinish = ref(false);

onMounted(async () => {
  const loadingInst = ElLoading.service({ fullscreen: true });
  await cfgStore.checkVscodeInOpenEuler();
  await cfgStore.updateCfgFromExtension();
  isIniFinish.value = true;
  if (!cfgStore.personalAccessToken) {
    // 初次进入未配置私人令牌的话，就弹窗配置
    await openAccessTokenPrompt(cfgStore);
  }
  loadingInst.close();
})
</script>

<template>
  <el-config-provider :locale="locZh" class="wh-full">
    <RouterView v-if="isIniFinish" />
  </el-config-provider>
</template>

<style lang="scss">
#app {
  padding: 0;
  background-color: var(--el-bg-color-page);
  min-width: 720px;
  min-height: 580px;
}

/*处理新版本element-plus drop-down出现黑边框问题*/
.el-dropdown:focus-visible,
.el-dropdown *:focus-visible {
  outline: none;
}

/*按设计稿覆盖样式*/
.el-message-box.common-confirm {
  width: 432px;
}
.el-message-box__btns {
  .el-button {
    padding: 3px 9px;
  }
}
.el-message-box__content p {
  font-size: 12px;
}
</style>
