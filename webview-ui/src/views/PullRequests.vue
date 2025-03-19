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
  <div class="warp">
    <div class="row-search f-c-c h-48px">
      <span class="sel-label mr-16px">选择PR目标openEuler仓库</span>
      <el-select-v2 v-model="repo" filterable :options="repoOptions" value-key="value" class="w-350px mr-16px"
        :disabled="prListLoading" @change="onQuery(true)" />
      <el-checkbox v-model="isMineOnly" label="仅显示我提交的" :disabled="prListLoading" @change="onQuery(true)" />
    </div>

    <div class="pr-list" v-loading="prListLoading">
      <el-card class="pr-card mt-16px" v-for="(item, i) in prList" :key="i">
        <div class="pr-card-top">
          <div class="pr-tag" :style="{ backgroundColor: STATUS_MAP.get(item.state)?.c }">
            !{{ item.number }} {{ STATUS_MAP.get(item.state)?.t }}
          </div>
          <el-input class="pr-tt" :value="item.title" v-model="inputList[i]"
            @change="changePRtitle(inputList[i], item.html_url, i)"></el-input>
        </div>
        <div class="pr-flow">
          <span>{{ item.head.repo.full_name }}</span>
          <span class="pr-flow-to">to</span>
          <span>{{ item.base.repo.full_name }}</span>
        </div>
        <div class="pr-time">
          <span>创建于{{ dayjs(item.created_at).format('YYYY-MM-DD HH:mm') }}</span>
          <span v-if="item.merged_at" class="underline">合并于{{ dayjs(item.merged_at).format('YYYY-MM-DD HH:mm') }}</span>
          <el-button class="action-button" @click="mergePullRequest(item.base.repo.namespace.path, item.base.repo.path, item.number, item.state, item.mergeable)">
            合入PR</el-button>
          <el-button class="action-button" @click="closePullRequest(item.base.repo.namespace.path, item.base.repo.path, item.number, item.state)">
            关闭PR</el-button>
          <el-button class="action-button" @click="openPullRequest(item.base.repo.namespace.path, item.base.repo.path, item.number, item.state)">
            打开PR</el-button>
        </div>
      </el-card>
      <div class="pr-list-blank wh-full f-c-c" v-if="listPlaceholder">
        {{ listPlaceholder }}
      </div>
    </div>
    <div class="pr-page">
      <el-pagination background layout="prev, pager, next" v-model:current-page="pageInfo.currentPage"
        :total="pageInfo.total" :page-size="20" :disabled="prListLoading" @current-change="onQuery(false)" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { dayjs } from 'element-plus';
import { usePluginCfgStore } from '@/store/modules/pluginCfg';
import { useOeReposStore } from '@/store/modules/oeRepos';
import { httpRequest } from '@/utils/request';
import { useCall } from '@/utils/apiClient';

const STATUS_MAP = new Map([
  ['open', { t: '开启', c: '#67c23a' }],
  ['closed', { t: '已关闭', c: '#f56c6c' }],
  ['merged', { t: '已合入', c: '#909399' }]
]);

const cfgStore = usePluginCfgStore();
const repoStore = useOeReposStore();

const repo = ref('');
const repoList = ref([] as typeof repoStore.repoInfoList);
const repoOptions = computed(() => {
  return repoList.value.map(v => ({
    value: v.ownerSlashRepo,
    label: v.ownerSlashRepo
  }));
});

const isMineOnly = ref(false);
const prListLoading = ref(false);
const prList = ref([] as any[]);
const inputList = ref([] as string[]);
const pageInfo = reactive({
  currentPage: 1,
  total: 0
});
async function reqPrList() {
  if (prListLoading.value || !cfgStore.personalAccessToken) {
    return;
  }
  prListLoading.value = true;
  const res = await httpRequest(`repos/${repo.value}/pulls`, {
    params: {
      access_token: cfgStore.personalAccessToken,
      state: 'all',
      page: pageInfo.currentPage,
      per_page: 20,
      ...(isMineOnly.value ? { author: cfgStore.giteeUserInfo.login } : {})
    }
  }).catch(() => { });
  prListLoading.value = false;
  prList.value = res?.dataList || [];
  pageInfo.total = Number(res?.dataHeaders?.total) || 0;
}

async function changePRtitle(input: string, url: string, index: number) {
  if (!input) {
    return;
  }
  const parts = url.split('/');
  const owner = parts[3];
  const repo = parts[4];
  const number = parts[6];
  prList.value[index].title = input;
  const res = await httpRequest(`repos/${owner}/${repo}/pulls/${number}`, {
    method: 'PATCH',
    params: {
      access_token: cfgStore.personalAccessToken,
      title: input,
      owner: owner,
      repo: repo,
      number: number,
    },
  })
}

function onQuery(shouldClearPage: boolean) {
  if (shouldClearPage) {
    pageInfo.currentPage = 1;
    pageInfo.total = 0;
  }
  const repoVal = repo.value;
  if (!repoVal) {
    prList.value = [];
    return;
  }
  reqPrList();
}

function openLink(url: string) {
  if (url) {
    useCall('WebviewApi.openExternal', url);
  }
}

const listPlaceholder = computed(() => {
  if (prListLoading.value || prList.value.length) {
    return '';
  }
  if (!repo.value) {
    return '请先选择一个openEuler仓库';
  }
  return '暂无数据';
});

async function mergePullRequest(fullName: string, repo: string, num: number, state: string, mergeable: boolean) {
  if (state == "open" && mergeable) {
    const response = JSON.parse(await useCall('WebviewApi.mergePullRequest', fullName, repo, num));
    if(response.err){
      ElMessage("合并PR失败，请检测是否有权限");
    }
    reqPrList();
  } else if (state == "merged") {
    ElMessage("PR已合并，无需再次合并");
  } else {
    ElMessage("无法合并PR，请检查PR状态并解决冲突");
  }
}

async function closePullRequest(fullName: string, repo: string, num: number, state: string) {
  if (state == "open") {
    const response = JSON.parse(await useCall('WebviewApi.closePullRequest', fullName, repo, num));
    if(response.err){
      ElMessage("关闭PR失败，请检查是否有权限");
    }
    reqPrList();
  } else {
    ElMessage("PR无需关闭");
  }
}

async function openPullRequest(fullName: string, repo: string, num: number, state: string) {
  if (state == "closed") {
    const response = JSON.parse(await useCall('WebviewApi.openPullRequest', fullName, repo, num));
    if(response.err){
      ElMessage("打开PR失败，请检查是否有权限");
    }
    reqPrList();
  } else {
    ElMessage("PR无需打开");
  }
}

watch(() => cfgStore.personalAccessToken, async tkn => {
  if (tkn && repoList.value.length === 0) {
    const loadingInst = ElLoading.service({ fullscreen: true });
    repoList.value = await repoStore.getRepoInfoList();
    loadingInst.close();
  }
}, { immediate: true });
</script>

<style lang="scss" scoped>
.warp {
  width: 100%;
  height: calc(100% - 4px);
  margin-top: 4px;
  background-color: var(--el-bg-color-overlay);
}

.pr-list {
  width: calc(100% - 32px);
  margin: 0 auto;
  padding: 0 16px 16px;
  height: calc(100% - 100px);
  overflow-y: auto;
  background-color: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.pr-card {
  cursor: pointer;
}

.pr-card-top {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.pr-tag {
  padding: 0 8px;
  flex-shrink: 0;
  color: #fff;
  font-size: 14px;
  height: 24px;
  border-radius: 8px;
  font-weight: bold;
  line-height: 24px;
}

.pr-tt .el-input__inner {
  margin-left: 12px;
  font-size: 16px;
  line-height: 24px;
  font-weight: bold;
  border: none;
  background: transparent;
  box-shadow: none;
}

.pr-flow {
  padding: 12px 0 8px;
  font-size: 12px;
  line-height: 18px;

  span {
    display: inline-block;
    padding: 0 4px;
    border-radius: 4px;
    margin-right: 6px;
    color: #fff;
    background-color: var(--el-color-info-light-5);
  }

  span.pr-flow-to {
    background: none;
    padding: 0;
  }
}

.pr-time {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  span {
    display: inline-block;
    margin-right: 6px;
  }
}

.pr-page {
  height: 48px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-button {
  padding: 5px 5px;
  font-size: 14px;
  border-radius: 5px;
  margin-left: 10px;
  border: 1px solid #e4e4e4;
}

.pr-list-blank {
  color: var(--el-color-info);
  font-size: 32px;
}
</style>