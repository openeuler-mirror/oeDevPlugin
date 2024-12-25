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
import { ref, watch, watchEffect } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCall, useSubscribable } from '@/utils/apiClient';
import { usePluginCfgStore } from '@/store/modules/pluginCfg';
import { openAccessTokenPrompt, getRouteNameFromExtensionMsg } from '@/utils/common';
import OeLogoSvg from '@/assets/oe_logo.svg';
import IconChevron from '@/assets/icon/chevron.svg';

const router = useRouter();
const route = useRoute();
const cfgStore = usePluginCfgStore();

const activeKey = ref<string | null>('');
function changeActiveKeyFromExtensionMsg(msg: string) {
  const rName = getRouteNameFromExtensionMsg(msg);
  if (rName) {
    activeKey.value = rName;
  }
}

const disposeExtensionRouteChange = useSubscribable('WebviewApi.getRouteForSubscribe', (routeName: string) => {
  changeActiveKeyFromExtensionMsg(routeName);
});

const gotoPage = (name: string) => {
  if (route.name !== name) {
    router.replace({ name });
  }
}

watch(
  () => route.name,
  (name) => {
    activeKey.value = name as string;
  },
  { immediate: true }
);

watchEffect(() => {
  if (activeKey.value && activeKey.value !== route.name) {
    gotoPage(activeKey.value)
  }
});

onMounted(async () => {
  if (!activeKey.value) {
    const routeMsg = await useCall('WebviewApi.getCurrentRoute');
    changeActiveKeyFromExtensionMsg(routeMsg as string);
  }
});

onUnmounted(() => {
  disposeExtensionRouteChange();
});
</script>

<template>
  <div class="demo-layout">
    <div class="layout-header">
      <div class="h-logo">
        <OeLogoSvg class="wh-full" />
      </div>
      <div class="header-rt">
        <el-button type="primary" size="small" @click="openAccessTokenPrompt(cfgStore)" v-if="!cfgStore.giteeUserInfo.id">Gitee授权</el-button>
        <el-dropdown v-else trigger="click" ref="dropdownRef">
          <span class="header-user f-c-c">
            {{ cfgStore.giteeUserInfo.name || cfgStore.giteeUserInfo.login }}
            <IconChevron class="w-18px ml-6px" />
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="openAccessTokenPrompt(cfgStore)">更换Gitee私人令牌</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <div class="layout-container">
      <Suspense>
        <router-view />
        <template #fallback>
          <el-skeleton></el-skeleton>
        </template>
      </Suspense>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$nav-height: 48px;

.demo-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.layout-header {
  height: $nav-height;
  padding: 0 24px;
  background-color: var(--el-bg-color-overlay);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.h-logo {
  width: 132px;
  height: 32px;
}
.header-user {
  cursor: pointer;
}
.layout-container {
  width: 100%;
  height: calc(100% - $nav-height);
  padding: 0 24px 24px;
}
</style>
