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

<template>
  <div class="issues-nav">
    <TabsBar class="mt-4px shrink-0" :tabs="TABS" :active="activeTab" @tab-change="changeActiveTab" />
    <el-checkbox v-model="isOeOnly" label="仅openEuler企业仓" :disabled="listLoading" @change="onQuery(true)" :border="true" />
  </div>
  <div class="issues-warp">
    <div class="issues-list" v-loading="listLoading">
      <el-card class="issues-card mt-16px" v-for="item in list" :key="item.id" @click="openLink(item.html_url)">
        <div class="issues-card-top">
          <div class="issues-tag" :style="{backgroundColor: STATUS_MAP.get(item.state)?.c}">
            #{{ item.number }} {{ STATUS_MAP.get(item.state)?.t }}
          </div>
          <div class="issues-flow">
            {{ item.repository.full_name }}
          </div>
        </div>
        <div class="issues-tt">{{ item.title }}</div>
        <div class="issues-time">
          <span>{{ item.user.name }}&nbsp;创建于&nbsp;{{ dayjs(item.created_at).format('YYYY-MM-DD HH:mm') }}</span>
          <span v-if="item.assignee" class="underline">负责人：{{item.assignee.name }}</span>
        </div>
      </el-card>
      <div class="issues-list-blank wh-full f-c-c" v-if="listPlaceholder">
        {{ listPlaceholder }}
      </div>
    </div>
    <div class="issues-page">
      <el-pagination background layout="prev, pager, next" v-model:current-page="pageInfo.currentPage"
        :total="pageInfo.total" :page-size="20" :disabled="listLoading" @current-change="onQuery(false)" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { dayjs } from 'element-plus';
import { usePluginCfgStore } from '@/store/modules/pluginCfg';
import { httpRequest } from '@/utils/request';
import { useCall } from '@/utils/apiClient';
import TabsBar from '@/components/TabsBar.vue';

const STATUS_MAP = new Map([
  ['open', {t: '开启的', c: '#67c23a'}],
  ['closed', {t: '已关闭', c: '#909399'}],
  ['rejected', {t: '拒绝的', c: '#f56c6c'}],
  ['progressing', {t: '进行中', c: '#409eff'}]
]);

const TABS = [
  {label: '我负责的', value: 'assigned'},
  {label: '我创建的', value: 'created'}
];

const activeTab = ref('assigned');
const changeActiveTab = (val: string) => {
  if (listLoading.value || val === activeTab.value) {
      return;
  }
  activeTab.value = val;
  onQuery(true);
};

const cfgStore = usePluginCfgStore();

const isOeOnly = ref(false);
const listLoading = ref(false);
const list = ref([] as any[]);

const pageInfo = reactive({
  currentPage: 1,
  total: 0
});
async function reqUserIssuesList() {
  if (listLoading.value || !cfgStore.personalAccessToken) {
    return;
  }
  listLoading.value = true;
  const res = await httpRequest(`user/issues`, {
    params: {
      access_token: cfgStore.personalAccessToken,
      filter: activeTab.value,
      state: 'all',
      page: pageInfo.currentPage,
      per_page: 20
    }
  }).catch(() => {});
  listLoading.value = false;
  list.value = res?.dataList || [];
  pageInfo.total = Number(res?.dataHeaders?.total) || 0;
}
async function reqOeIssuesList() {
  if (listLoading.value || !cfgStore.personalAccessToken) {
    return;
  }
  listLoading.value = true;
  const res = await httpRequest(`enterprises/open_euler/issues`, {
    params: {
      access_token: cfgStore.personalAccessToken,
      state: 'all',
      page: pageInfo.currentPage,
      per_page: 10,
      ...(activeTab.value === 'assigned' ? { assignee: cfgStore.giteeUserInfo.login } : {}),
      ...(activeTab.value === 'created' ? { creator: cfgStore.giteeUserInfo.login } : {}),
    }
  }).catch(() => {});
  listLoading.value = false;
  list.value = res?.dataList || [];
  pageInfo.total = Number(res?.dataHeaders?.total) || 0;
}

function onQuery(shouldClearPage: boolean) {
  list.value = [];
  if (shouldClearPage) {
    pageInfo.currentPage = 1;
    pageInfo.total = 0;
  }
  if (isOeOnly.value) {
    reqOeIssuesList();
  } else {
    reqUserIssuesList();
  }
}

function openLink(url: string) {
  if (url) {
    useCall('WebviewApi.openExternal', url);
  }
}

const listPlaceholder = computed(() => {
  if (listLoading.value || list.value.length) {
    return '';
  }
  return '暂无数据';
});

watch(() => cfgStore.personalAccessToken, tkn => {
  if (tkn) {
    onQuery(true);
  }
}, { immediate: true });
</script>

<style lang="scss" scoped>
.issues-nav {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.issues-warp {
  width: 100%;
  height: calc(100% - 44px);
  padding-top: 12px;
  background-color: var(--el-bg-color-overlay);
}
.issues-list {
  width: calc(100% - 32px);
  margin: 0 auto;
  padding: 0 16px 16px;
  height: calc(100% - 52px);
  overflow-y: auto;
  background-color: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}
.issues-card {
  cursor: pointer;
}
.issues-card-top {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}
.issues-tag {
  margin-right: 10px;
  padding: 0 8px;
  flex-shrink: 0;
  color: #fff;
  font-size: 14px;
  height: 20px;
  border-radius: 8px;
  font-weight: bold;
  line-height: 20px;
}
.issues-flow {
  color: var(--el-color-regular);
  line-height: 20px;
}
.issues-tt {
  padding: 8px 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: bold;
}
.issues-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  span {
    display: inline-block;
    margin-right: 10px;
  }
}
.issues-page {
  height: 48px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.issues-list-blank {
  color: var(--el-color-info);
  font-size: 32px;
}
</style>
