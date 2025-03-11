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
  <TabsBar class="mt-4px shrink-0" :tabs="TABS" :active="activeTab" @tab-change="changeActiveTab" />
  <div class="warp">
    <div class="div-list" v-loading="listLoading">
      <el-card class="item-card mt-16px" v-for="(item, i) in list" :key="item.id">
        <div class="item-card-top">
          <span class="item-tag" :style="{ backgroundColor: item.public ? '#409eff' : '#f56c6c' }">
            {{ item.public ? '公开' : '私有' }}
          </span>
          <span class="item-tt">
            {{ item.humanName }}
          </span>
          <span class="item-sub">
            {{ item.fullName }}
          </span>
        </div>
        <div class="item-fork" v-if="item.fork">
          forked from&nbsp;<span>{{ item.forkHumanName }}</span>
        </div>
        <div class="item-desc" v-if="item.description">{{ item.description }}</div>
        <div class="item-time">
          <span>上次更新&nbsp;{{ dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm') }}</span>
          <span class="sel-label mr-16px">选择分支</span>
          <el-select-v2 v-model="cloneForm.branch[i]" filterable :options="branchesList" @focus="loadBranchData(item)"
            value-key="value" class="w-350px" placeholder="请选择分支" />
        </div>
        <div class="repoButtons">
          <el-button @click="cloneRepo(item, cloneForm.branch[i])"
            class="action-button">克隆仓库</el-button>
          <el-button @click="openLink(item.fullName)" class="action-button">打开链接</el-button>
          <el-button @click="openInFolder(item, cloneForm.branch[i])"
            class="action-button">在文件夹中打开</el-button>
          <el-button @click="openInIde(item, cloneForm.branch[i])"
            class="action-button">在VS-CODE中打开</el-button>
          <el-button @click="copyUrl(item.fullName)" class="action-button">复制仓库地址</el-button>
        </div>
      </el-card>
      <div class="div-list-blank wh-full f-c-c" v-if="listPlaceholder">
        {{ listPlaceholder }}
      </div>
    </div>
    <div class="div-page">
      <el-pagination background layout="prev, pager, next" v-model:current-page="pageInfo.currentPage"
        :disabled="listLoading" :total="pageInfo.total" :page-size="pageInfo.pageSize"
        @current-change="reqList(false)" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { dayjs } from 'element-plus';
import { usePluginCfgStore } from '@/store/modules/pluginCfg';
import { httpRequest } from '@/utils/request';
import { useCall, useSubscribable } from '@/utils/apiClient';
import TabsBar from '@/components/TabsBar.vue';

const TABS = [
  { label: '全部', value: 'all' },
  { label: '我创建的', value: 'mine' },
  // 暂时删除forks -- 目前无法通过接口参数过滤forks，获取全量仓库可能会导致查询很慢
  // {label: 'Forks', value: 'forks'}
];
const activeTab = ref('all');
const changeActiveTab = (val: string) => {
  if (listLoading.value || val === activeTab.value) {
    return;
  }
  activeTab.value = val;
  reqList(true);
};

const cfgStore = usePluginCfgStore();

const listLoading = ref(false);
const list = ref([] as any[]);



const pageInfo = reactive({
  currentPage: 1,
  total: 0,
  pageSize: 20
});

const cloneForm = reactive({
  repo: '',
  branch: [] as string[],
  currentPath: ''
})

const branchesList = ref([] as string[]);

async function reqList(shouldClearPage: boolean) {
  if (listLoading.value) {
    return;
  }
  listLoading.value = true;
  if (shouldClearPage) {
    pageInfo.currentPage = 1;
    pageInfo.total = 0;
  }
  const res = await httpRequest(`user/repos`, {
    params: {
      access_token: cfgStore.personalAccessToken,
      sort: 'updated',
      ...(activeTab.value === 'mine' ? { type: 'owner' } : {}),
      page: pageInfo.currentPage,
      per_page: pageInfo.pageSize
    }
  }).catch(() => { });
  listLoading.value = false;
  const userLoginName = cfgStore.giteeUserInfo.login;
  list.value = [
    ...(res?.dataList || []).map(v => ({
      id: v.id,
      public: v.public,
      humanName: v.human_name,
      fullName: v.full_name,
      fork: v.fork,
      forkHumanName: v.parent?.human_name || '',
      description: v.description,
      updatedAt: v.updated_at,
      htmlUrl: v.html_url,
      isMine: v.owner?.login === userLoginName,
      isBranchLoaded: false,
    }))
  ];
  pageInfo.total = Number(res?.dataHeaders?.total) || 0;
}

const loadBranchData = async (item: any) => {
  await reqBranchList(item);
}

async function reqBranchList(repoInfo: any) {
  if (repoInfo.isbranchesLoaded) {
    return;
  }
  const full_name = repoInfo.fullName;
  branchesList.value = [];
  repoInfo.isbranchesLoaded = true;
  const branch = await httpRequest(`repos/${full_name}/branches`, {
    params: {
      access_token: cfgStore.personalAccessToken,
      page: 1,
      per_page: 20
    }
  }).catch(() => { });
  branchesList.value = [
    ...branchesList.value,
    ...(branch?.dataList || []).map(v => ({
      value: v.name,
      label: v.name
    }))
  ];
}

async function cloneRepo(repoInfo: any, branch: string) {
  const fullName = repoInfo.fullName;
  console.info(`fullName ${fullName}`);
  const loadingInst = ElLoading.service({ fullscreen: true });
  const res: Record<string, unknown> = await useCall('WebviewApi.doCloneRepo', fullName, branch, cfgStore.targetFolder);
  loadingInst.close();
  ElMessage[res?.suc ? 'success' : 'error'](res?.msg || '克隆项目失败：未知错误');
}

async function openInFolder(repoInfo: any, branch: string) {
  const fullName = repoInfo.fullName;
  console.info(`fullName ${fullName}`);
  await useCall('WebviewApi.doOpenInFolder', fullName, branch, cfgStore.targetFolder);
}

async function openInIde(repoInfo: any, branch: string) {
  const fullName = repoInfo.fullName;
  console.info(`fullName ${fullName}`);
  ElMessage.info(await useCall("WebviewApi.openInIde", fullName, branch, cfgStore.targetFolder));
}

async function copyUrl(fullName: any) {
  const url = `https://gitee.com/${fullName}`;
  if (url) {
    ElMessage.info(await useCall('WebviewApi.doCopyUrl', url));
  }
}

function openLink(repo: any) {
  const url = `https://gitee.com/${repo}`;
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

function changeActiveKeyFromExtensionMsg(msg: string) {
  const params = msg.split('#');
  if (params[0] === 'MyRepos' && params[1]) {
    activeTab.value = params[1];
  }
}

const disposeExtensionRouteChange = useSubscribable('WebviewApi.getRouteForSubscribe', (routeName: string) => {
  changeActiveKeyFromExtensionMsg(routeName);
});

onMounted(async () => {
  const routeMsg = await useCall('WebviewApi.getCurrentRoute');
  changeActiveKeyFromExtensionMsg(routeMsg as string);
  watch(() => cfgStore.personalAccessToken, tkn => {
    if (tkn) {
      reqList(true);
    }
  }, { immediate: true });
});

onUnmounted(() => {
  disposeExtensionRouteChange();
});
</script>

<style lang="scss" scoped>
.warp {
  width: 100%;
  height: calc(100% - 44px);
  padding-top: 12px;
  background-color: var(--el-bg-color-overlay);
}

.div-list {
  width: calc(100% - 32px);
  margin: 0 auto;
  padding: 0 16px 16px;
  height: calc(100% - 52px);
  overflow-y: auto;
  background-color: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.item-card {
  cursor: pointer;
}

.item-card-top {
  width: 100%;
}

.item-tag {
  margin-right: 10px;
  padding: 0 8px;
  display: inline-block;
  color: #fff;
  font-size: 14px;
  border-radius: 8px;
  font-weight: bold;
  line-height: 24px;
}

.item-tt {
  margin-right: 10px;
  display: inline-block;
  font-size: 16px;
  line-height: 24px;
  font-weight: bold;
}

.item-sub {
  display: inline-block;
  font-size: 14px;
  line-height: 20px;
}

.item-fork {
  padding-left: 54px;
  font-size: 14px;
  line-height: 20px;
  color: var(--el-color-info);

  span {
    color: var(--el-color-info);
  }
}

.item-desc {
  margin-top: 4px;
  font-size: 14px;
  line-height: 20px;
  color: var(--el-text-color-regular);
}

.item-time {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  span {
    display: inline-block;
    margin-right: 10px;
  }
}

.div-page {
  height: 48px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.div-list-blank {
  color: var(--el-color-info);
  font-size: 32px;
}

.action-button {
  padding: 5px 5px;
  font-size: 14px;
  border-radius: 5px;
  margin-left: 10px;
  border: 1px solid #e4e4e4;
}

.repoButtons{
  margin-top: 20px;
}
</style>