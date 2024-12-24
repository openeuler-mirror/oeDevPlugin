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
    <!-- 搜索框和仓库选择 -->
    <div class="row-search f-c-c h-48px">
      <span class="sel-label mr-16px">选择openEuler仓库</span>
      <el-select-v2 v-model="filterValue" filterable :options="repoData" value-key="value" class="w-350px mr-16px"
        @change="filterChange()" />
    </div>
    <!-- 仓库列表 -->
    <div class="repo-list" v-loadint="openEulerListLoading">
      <el-card class="repo-card mt-16px" v-for="(item, i) in ShowRepoData" :key="item.id">
        <div class="repo-header">
          <span class="repo-tt">{{ item.repo }}</span>
        </div>
        <el-form-item label="分支名称" prop="branch">
          <el-select-v2 v-model="cloneForm.branch[i]" filterable :options="branches" value-key="value"
            @focus="loadBranchData(item)" class="w-350px" />
        </el-form-item>
        <div class="repo-tags">暂无标签</div>
        <div class="repo-buttons">
          <button @click="cloneRepo(item.repo, cloneForm.branch[i], cloneForm.currentPath)"
            class="action-button">克隆仓库</button>
          <button @click="openLink(item)" class="action-button">打开链接</button>
          <button @click="openInFolder(item.repo, cloneForm.branch[i], cloneForm.currentPath)"
            class="action-button">在文件夹中打开</button>
          <button @click="openInIde(item.repo, cloneForm.branch[i], cloneForm.currentPath)"
            class="action-button">在VS-CODE中打开</button>
          <button @click="copyUrl()" class="action-button">复制仓库地址</button>
        </div>
      </el-card>
      <!-- 空数据提示 -->
      <div v-if="listPlaceholder" class="repo-list-blank">
        {{ listPlaceholder }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { usePluginCfgStore } from '@/store/modules/pluginCfg';
import { useCall } from '@/utils/apiClient';
import { httpRequest } from '@/utils/request';
import { ref, reactive, computed, watch, watchEffect } from 'vue';

interface RepoInfo {
  owner: string;
  repo: string;
  ownerSlashRepo: string;
  id: number;
  html_url: string;
  branches: string[];
}

const cfgStore = usePluginCfgStore();
const auth = usePluginCfgStore().personalAccessToken;
const repoInfoList = ref<RepoInfo[]>([]);
const cloneForm = reactive({
  repo: '',
  branch: [] as string[],
  currentPath: ''
})

const filterInput = ref('');
const branches = ref([] as string[]);
const repoData = ref<any>([]);
const ShowRepoData = ref<any>([]);
const filterValue = ref('');

const openEulerListLoading = ref(false);

const loadBranchData = async (repoInfo: RepoInfo) => {
  await reqBranchList(repoInfo);
}

watchEffect(() => {
  const cfgTarget = cfgStore.targetFolder;
  if (cfgTarget !== cloneForm.currentPath) {
    cloneForm.currentPath = cfgTarget || '';
  }
});

watch(() => cfgStore.personalAccessToken, async tkn => {
  if (tkn && repoInfoList.value.length === 0) {
    const loadingInst = ElLoading.service({ fullscreen: true });
    await reqRepoInfoList();
    loadingInst.close();
  }
}, { immediate: true })

const listPlaceholder = computed(() => {
  if (openEulerListLoading.value || repoInfoList.value.length) {
    return '';
  }
  return '暂无数据';
})

async function filterChange() {
  if (filterValue.value == '') {
    return;
  }
  ShowRepoData.value = repoInfoList.value.filter(item =>
    item.repo.toLowerCase().includes(filterValue.value.toLowerCase())
  );
}

async function reqRepoInfoList() {
  if (!auth || openEulerListLoading.value) {
    return [];
  }
  openEulerListLoading.value = true;
  const res = [] as RepoInfo[];
  try {
    const resp = await httpRequest(`repos/openeuler/community/git/trees/master?access_token=${auth}&recursive=1`).catch(() => { });
    const list = resp?.tree || [];
    const count = ref<number>(0);
    for (let i = 0; i < list.length; i++) {
      const element = list[i];
      const branches = ref([] as string[]);
      const path = element.path || '';
      const html_url = element.html_url;

      if (!path.endsWith('.yaml')) {
        continue;
      }
      let owner;
      if (path.includes('/openeuler/')) {
        count.value++;
        owner = 'openeuler';
      } else {
        continue;
      }
      const repo = path.split('/').pop().slice(0, -5);

      res.push({
        owner,
        repo,
        ownerSlashRepo: `${owner}/${repo}`,
        id: count.value,
        html_url,
        branches: branches.value
      })
    }
    repoInfoList.value = res;
    ShowRepoData.value = res;
    repoData.value = res.map(v => ({
      value: v.repo,
      label: v.repo
    }))
  } catch (error) {
    console.error(" get repo info list error " + error);
    openEulerListLoading.value = false;
    repoInfoList.value = [];
  }
}

async function reqBranchList(repo: RepoInfo) {
  branches.value = [];
  const branch = await httpRequest(`repos/${repo.owner}/${repo.repo}/branches`, {
    params: {
      access_token: auth,
      page: 1,
      per_page: 100
    }
  }).catch(() => { });
  branches.value = [
    ...branches.value,
    ...(branch?.dataList || []).map(v => ({
      value: v.name,
      label: v.name
    }))
  ];
}

async function cloneRepo(repoUrl: string, branch: string, currentPath: string) {
  const res: Record<string, unknown> = await useCall('WebviewApi.doCloneRepo', repoUrl, branch, currentPath);
  ElMessage[res?.suc ? 'success' : 'error'](res?.msg || '克隆项目失败：未知错误');
}

async function openInFolder(repoUrl: string, branch: string, currentPath: string) {
  await useCall('WebviewApi.doOpenInFolder', repoUrl, branch, currentPath);
}

async function openInIde(repoUrl: string, branch: string, currentPath: string) {
  await useCall("WebviewApi.openInIde", repoUrl, branch, currentPath);
}

function copyUrl() {
  try {
    /*repoUrl = "aaaaa";
    clipboardy.writeSync(repoUrl);
    vscode.window.showInformationMessage('复制repo地址为', repoUrl);*/
  } catch (error) {
    console.error('复制repo地址失败');
  }
}

function openLink(repoInfo: RepoInfo) {
  const url = `https://gitee.com/${repoInfo.ownerSlashRepo}`;
  if (url) {
    useCall('WebviewApi.openExternal', url);
  }
}
</script>

<style lang="scss" scoped>
.repo-list {
  width: 100%;
  padding: 16px;
  height: calc(100% - 100px);
  overflow-y: auto;
  background-color: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.repo-card .repo-header {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px; /* 增加下方间距 */
}

.el-form-item {
  margin-bottom: 12px; /* 增加“分支名称”框与其他部分的间距 */
}

.repo-tags {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-top: 8px; /* 增加标签与按钮之间的间距 */
}

.repo-buttons {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap; /* 使按钮支持换行 */
  gap: 16px;
  justify-content: flex-start; /* 左对齐 */
}

.action-button {
  padding: 6px 12px; /* 按钮内边距，确保按钮紧凑 */
  font-size: 12px; /* 设置字体大小小于默认字体 */
  background-color: var(--el-color-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.3s ease;
  width: auto; /* 自动宽度，包裹文字 */
  white-space: nowrap; /* 防止文本换行 */
  text-align: center; /* 确保文本居中对齐 */
}

.action-button:hover {
  background-color: var(--el-color-primary-dark);
  transform: scale(1.05);
}

.row-search {
  display: flex;
  align-items: center;
  margin-bottom: 16px; /* 增加底部间距 */
}

.sel-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-right: 16px; /* 增加右侧间距 */
}

.repo-list-blank {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  text-align: center;
  padding: 50px;
}
</style>
