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
    <!-- 搜索框和仓库选择 -->
    <div class="row-search f-c-c h-48px">
      <span class="sel-label mr-16px">选择仓库</span>
      <el-select-v2 v-model="filterValue" filterable :options="repoOptions" value-key="value" class="w-350px mr-16px"
        @change="filterChange" clearable :disabled="listLoading" />
    </div>
    <div class="div-list" v-loading="listLoading">
      <el-card class="repo-card mt-16px" v-for="(item, i) in filteredRepoList" :key="item.ownerSlashRepo">
        <div class="item-card-top">
          <span class="item-tag" :style="{ backgroundColor: '#004080' }">
            {{ '公开' }}
          </span>
          <span class="item-tt">
            {{ item.owner }}
          </span>
          <span class="item-sub">
            {{ item.repo }}
          </span>
        </div>
        <div class="row-search flex items-center h-48px">
          <span class="sel-label mr-16px">选择分支</span>
          <el-select-v2 v-model="cloneForm.branch[i]" filterable :options="branchesList" value-key="value"
            @focus="loadBranchData(item)" class="w-350px" placeholder="请选择分支" />
        </div>
        <div class="common-card-footer">
          <el-button text bg class="action-button" @click="cloneRepo(item.ownerSlashRepo, cloneForm.branch[i], cloneForm.currentPath)">
            克隆仓库
          </el-button>
          <el-button text bg class="action-button" @click="openLink(item.ownerSlashRepo)">
            打开链接
          </el-button>
          <el-button text bg class="action-button" @click="openInFolder(item.ownerSlashRepo, cloneForm.branch[i], cloneForm.currentPath)">
            在文件夹中打开
          </el-button>
          <el-button text bg class="action-button" @click="openInIde(item.ownerSlashRepo, cloneForm.branch[i], cloneForm.currentPath)">
            在VS-CODE中打开
          </el-button>
          <el-button text bg class="action-button" @click="copyUrl(item.ownerSlashRepo)">
            复制仓库地址
          </el-button>
          <el-button text bg class="action-button" @click="openDialog(item.ownerSlashRepo, item.owner)">
            fork仓库
          </el-button>
          <el-button v-if="cfgStore.isVscodeInOpenEuler && activeTab === 'src-openeuler'"
            text bg class="action-button" @click="doRpmbuild(item.ownerSlashRepo, cloneForm.branch[i])">
            本地构建
          </el-button>
        </div>
      </el-card>
      <div class="div-list-blank wh-full f-c-c" v-if="listPlaceholder">
        {{ listPlaceholder }}
      </div>
    </div>
    <el-dialog v-model="dialogVisible" title="请确认仓库fork的目标空间" width="500">
      <div class="repo-exist-tip" v-if="repoExistTip">
        <el-icon><Warning /></el-icon>
        <span>同名仓库已存在，将自动添加后缀</span>
      </div>
      <el-form :model="form">
        <el-form-item :label="`${cfgStore.giteeUserInfo.name} @${cfgStore.giteeUserInfo.login}`"
          :label-width="300"></el-form-item>
        <el-form-item label="仓库名称 *" :label-width="140">
          <el-input v-model="form.name" :placeholder="`${form.name}`" autocomplete="off" />
        </el-form-item>
        <el-form-item label="路径 *" :label-width="140">
          <el-input v-model="form.path" :placeholder="`${form.path}`" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="forkRepo()">
            确认
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <div class="div-page">
      <el-pagination background layout="prev, pager, next" v-model:current-page="pageInfo.currentPage"
        :total="pageInfo.total" :page-size="pageInfo.pageSize" :disabled="listLoading"
        @current-change="reqRepoInfoList" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import axios from 'axios';
import { Warning } from '@element-plus/icons-vue';
import { usePluginCfgStore } from '@/store/modules/pluginCfg';
import { useOeReposStore } from '@/store/modules/oeRepos';
import { httpRequest } from '@/utils/request';
import { useCall, useSubscribable } from '@/utils/apiClient';
import TabsBar from '@/components/TabsBar.vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const repoStore = useOeReposStore();

let dialogVisible = ref(false);
let commitCodeDialogVisible = ref(false);
const TABS = [
  { label: 'openEuler', value: 'openeuler' },
  { label: 'src-openEuler', value: 'src-openeuler' }
  // { label: '其他', value: 'others' }
];

interface RepoInfo {
  owner: string;
  repo: string;
  ownerSlashRepo: string;
  isbranchesLoaded: boolean;
  htmlUrl: string;
  public: boolean;
}

const cloneForm = reactive({
  repo: '',
  branch: [] as string[],
  currentPath: ''
})

const activeTab = ref('openeuler');
const changeActiveTab = (val: string) => {
  if (listLoading.value || val === activeTab.value) {
    return;
  }
  activeTab.value = val;
  filterValue.value = '';
  reqRepoInfoList();
};

const form = reactive({
  name: '',
  path: '',
  repo: '',
  owner: '',
})

const cfgStore = usePluginCfgStore();

const listLoading = ref(false);
const filterValue = ref('');
const repoList = ref([] as typeof repoStore.repoInfoList);
const myRepos = ref([] as RepoInfo[]);
const filteredRepoList = ref([] as RepoInfo[]);
const repoOptions = computed(() => {
  return repoList.value.filter(v => v.owner === activeTab.value).map(v => ({
    value: v.ownerSlashRepo,
    label: v.ownerSlashRepo
  }));
});

const branchesList = ref([] as string[]);

// 从pr/issue页面的toRepo按钮而来，则需要提前赋值filterValue给初始化请求使用
const initialFilterValue = repoStore.toRepoTarget;
if (initialFilterValue) {
  filterValue.value = initialFilterValue;
  repoStore.setToRepoTarget('');
}

watchEffect(() => {
  const cfgTarget = cfgStore.targetFolder;
  if (cfgTarget !== cloneForm.currentPath) {
    cloneForm.currentPath = cfgTarget || '';
  }
});

const filterChange = async () => {
  if (!filterValue.value) {
    pageInfo.currentPage = 1;
    await reqRepoInfoList();
  } else {
    const [owner, repo] = filterValue.value.split('/');
    listLoading.value = true;
    const resp = await httpRequest(`/repos/${owner}/${repo}`);
    listLoading.value = false;
    const repoInfo = [] as RepoInfo[];
    repoInfo.push({
      owner: owner,
      repo: repo,
      ownerSlashRepo: resp.full_name,
      isbranchesLoaded: false,
      htmlUrl: resp.html_url,
      public: resp.public,
    });
    filteredRepoList.value = repoInfo;
    pageInfo.currentPage = 1;
    pageInfo.total = 1;
  }
}

const pageInfo = reactive({
  currentPage: 1,
  total: 0,
  pageSize: 20
});

const pageList = computed(() => {
  let full = filteredRepoList.value;
  if (activeTab.value === 'src-openeuler') {
    full = full.filter(v => v.owner === 'src-openeuler');
  } else if (activeTab.value === 'openeuler') {
    full = full.filter(v => v.owner === 'openeuler');
  }
  return full.slice(pageInfo.pageSize * (pageInfo.currentPage - 1), pageInfo.pageSize * pageInfo.currentPage);
});

const loadBranchData = async (repoInfo: RepoInfo) => {
  await reqBranchList(repoInfo);
}


const branchesListLoading = ref(false);

async function reqRepoInfoList() {
  if (listLoading.value) {
    return;
  }
  const auth = usePluginCfgStore().personalAccessToken;
  if (!auth) {
    return;
  }
  listLoading.value = true;
  const organization = activeTab.value;
  const res = [] as RepoInfo[];
  const resp = await httpRequest(`/orgs/${organization}/repos?type=public&page=${pageInfo.currentPage}&per_page=${pageInfo.pageSize}`).catch(() => { });
  const list = resp?.dataList || [];

  for (let i = 0; i < list.length; i++) {
    const element = list[i];
    const htmlUrl = element.htmlUrl || '';
    res.push({
      owner: organization,
      repo: element.name,
      ownerSlashRepo: element.full_name,
      isbranchesLoaded: false,
      htmlUrl,
      public: element.public,
    });
  }
  pageInfo.total = Number(resp?.dataHeaders?.total) || 0;
  listLoading.value = false;
  filteredRepoList.value = res;
}
async function reqBranchList(repoInfo: RepoInfo) {
  if (repoInfo.isbranchesLoaded) {
    return;
  }
  branchesList.value = [];
  branchesListLoading.value = true;
  repoInfo.isbranchesLoaded = true;
  const branch = await httpRequest(`repos/${repoInfo.ownerSlashRepo}/branches`, {
    params: {
      access_token: cfgStore.personalAccessToken,
      page: 1,
      per_page: 20
    }
  }).catch(() => { });
  branchesListLoading.value = false;
  branchesList.value = [
    ...branchesList.value,
    ...(branch?.dataList || []).map(v => ({
      value: v.name,
      label: v.name
    }))
  ];
}


function openLink(repoInfo: string) {
  const url = `https://gitee.com/${repoInfo}`;
  if (url) {
    useCall('WebviewApi.openExternal', url);
  }
}

const listPlaceholder = computed(() => {
  if (listLoading.value || filteredRepoList.value.length) {
    return '';
  }
  return '暂无数据';
});

async function doRpmbuild(ownerSlashRepo: string, branch: string) {
  const confirmed = await ElMessageBox.confirm('即将使用root权限运行脚本，必要时请输入root密码以执行相关功能，是否继续？', '提示', {
    type: 'warning',
    customClass: 'common-confirm',
    cancelButtonText: '取消',
    confirmButtonText: '继续',
    closeOnClickModal: false,
    closeOnPressEscape: false,
  }).then(() => true).catch(() => false);
  if (!confirmed) {
    return;
  }
  const loadingInst = ElLoading.service({ fullscreen: true });
  const res: Record<string, unknown> = await useCall('WebviewApi.cloneAndRunRpmbuild', ownerSlashRepo, branch);
  loadingInst.close();
  ElMessage[res?.suc ? 'success' : 'error'](res?.msg || '运行本地构建失败：未知错误');
}

watch(() => cfgStore.personalAccessToken, async tkn => {
  if (tkn && repoList.value.length === 0) {
    const loadingInst = ElLoading.service({ fullscreen: true });
    repoList.value = await repoStore.getRepoInfoList();
    await filterChange();
    loadingInst.close();
  }
}, { immediate: true });

function changeActiveKeyFromExtensionMsg(msg: string) {
  const params = msg.split('#');
  if (params[0] === 'Communitys' && params[1]) {
    activeTab.value = params[1];
  }
}

const disposeExtensionRouteChange = useSubscribable('WebviewApi.getRouteForSubscribe', (routeName: string) => {
  changeActiveKeyFromExtensionMsg(routeName);
});

onMounted(async () => {
  const routeMsg = await useCall('WebviewApi.getCurrentRoute');
  changeActiveKeyFromExtensionMsg(routeMsg as string);
});

onUnmounted(() => {
  disposeExtensionRouteChange();
});

async function cloneRepo(repoUrl: string, branch: string, currentPath: string) {
  const loadingInst = ElLoading.service({ fullscreen: true });
  const res: Record<string, unknown> = await useCall('WebviewApi.doCloneRepo', repoUrl, branch, currentPath);
  loadingInst.close();
  ElMessage[res?.suc ? 'success' : 'error'](res?.msg || '克隆项目失败：未知错误');
}

async function openInFolder(repoUrl: string, branch: string, currentPath: string) {
  await useCall('WebviewApi.doOpenInFolder', repoUrl, branch, currentPath);
}

async function openInIde(repoUrl: string, branch: string, currentPath: string) {
  ElMessage.info(await useCall("WebviewApi.openInIde", repoUrl, branch, currentPath));
}

async function copyUrl(ownerSlashRepo: string) {
  const url = `https://gitee.com/${ownerSlashRepo}`;
  if (url) {
    ElMessage.info(await useCall('WebviewApi.doCopyUrl', url));
  }
}

const repoExistTip = ref(false);

async function checkRepoExist(repoName: string) {
  try {
    const res = await axios.get(
      `https://gitee.com/api/v5/repos/${cfgStore.giteeUserInfo.login}/${repoName}`,
      {
        params: {
          access_token: cfgStore.personalAccessToken
        }
      }
    );
    return res?.data.id !== undefined;
  } catch (error) {
    // 404表示仓库不存在，其他错误视为存在
    return axios.isAxiosError(error) && error.response?.status !== 404;
  }
}

async function findAvailableRepoName(baseName: string) {
  let name = baseName;
  let suffix = 0;
  
  while (suffix < 9) {
    const exists = await checkRepoExist(name);
    if (!exists) {
      return name;
    }
    suffix++;
    name = `${baseName}_${suffix}`;
  }
  return baseName;
}

async function openDialog(ownerSlashRepo: string, owner: string) {
  if (!ownerSlashRepo) {
    ElMessage.error('fork仓库失败，未知错误');
    return;
  }
  const repo = ownerSlashRepo.split('/')[1];
  form.repo = repo;
  form.owner = owner;
  
  const availableName = await findAvailableRepoName(repo);
  form.name = availableName;
  form.path = availableName;
  
  repoExistTip.value = availableName !== repo;
  
  dialogVisible.value = true;
}

async function forkRepo() {
  if (!form.name || !form.path) {
    ElMessage.error('fork仓库失败，参数错误');
    dialogVisible.value = false;
    return;
  }
  const owner = form.owner;
  const repo = form.repo;
  const name = form.name;
  const path = form.path;
  
  const response = JSON.parse(await useCall('WebviewApi.forkRepo', owner, repo, name, path));
  if (response.out?.includes('已经存在同名的仓库')) {
    ElMessage.error("Fork 失败，请尝试修改仓库名称");
    return;
  }

  if (response.err) {
    ElMessage.error("Fork 失败：" + (response.msg || "未知错误"));
    return;
  }

  let treeItemId = 'my_project-all'
  if (treeItemId) {
    repoStore.setToRepoTarget(`${cfgStore.giteeUserInfo.login}/${path}`);
    useCall('WebviewApi.revealTreeNode', treeItemId);
  }
  
  ElMessage.success("Fork 成功");
  dialogVisible.value = false;
}

</script>

<style lang="scss" scoped>
@use '@/assets/style/common-vars.scss' as *;

.repo-exist-tip {
  display: flex;
  align-items: center;
  color: var(--el-color-warning);
  font-size: 12px;
  margin-bottom: 16px;
  
  .el-icon {
    margin-right: 4px;
  }
}

:deep(.common-card-footer) {
  @extend %common-card-footer;
  margin-top: 0;
}

.warp {
  width: 100%;
  height: calc(100% - 64px);
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

.change-list {
  margin: 16px 0;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.change-item {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-light);

  &:last-child {
    border-bottom: none;
  }
}

.file-name {
  font-size: 14px;
  color: var(--el-text-color-regular);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
