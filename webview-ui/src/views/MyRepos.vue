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
        <div class="common-card-footer">
          <el-button text bg class="action-button" @click="cloneRepo(item, cloneForm.branch[i])">
            克隆仓库
          </el-button>
          <el-button text bg class="action-button" @click="openLink(item.fullName)">
            打开链接
          </el-button>
          <el-button text bg class="action-button" @click="openInFolder(item, cloneForm.branch[i])">
            打开文件夹
          </el-button>
          <el-button text bg class="action-button" @click="openInIde(item, cloneForm.branch[i])">
            在IDE中打开
          </el-button>
          <el-button text bg class="action-button" @click="copyUrl(item.fullName)">
            复制仓库地址
          </el-button>
          <el-button class="action-button" @click="openCommitCodeDialog(item.fullName)">
            提交代码
          </el-button>
        </div>
      </el-card>
      <div class="div-list-blank wh-full f-c-c" v-if="listPlaceholder">
        {{ listPlaceholder }}
      </div>
    </div>
    <el-dialog class="commit-dialog" v-model="commitCodeDialogVisible" width="600px" title="提交代码">
      <el-form :model="commitInfo">
        <!-- 顶部输入框 -->
        <el-form-item label="提交信息" label-width="80px">
          <el-input v-model="commitInfo.commitMessage" type="textarea" :rows="3" placeholder="请输入提交说明" maxlength="200"
            show-word-limit />
        </el-form-item>

        <el-form-item label="远程仓库" label-width="80px">
          <el-select v-model="commitInfo.remote" placeholder="请选择远程仓库" class="w-full"  value-key="value">
            <el-option
              v-for="item in remotesList"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择分支" label-width="80px">
          <el-select-v2 v-model="commitInfo.branch" filterable placeholder="请选择分支" :options="branchesList" @focus="loadBranch" class="w-full"/>
      
        </el-form-item>
        <!-- 文件列表区域 -->
        <div class="file-lists">
          <div class="file-list">
            <h4>待添加文件</h4>
            <div class="file-items">
              <div v-for="(file, index) in commitInfo.changedFiles" :key="index" class="file-item">
                <span class="file-name">{{ file }}</span>
                <el-button type="primary" link @click="addFiles(file)" size="small" icon="Plus" />
              </div>
            </div>
          </div>

          <div class="file-list">
            <h4>已添加文件</h4>
            <div class="file-items">
              <div v-for="(file, index) in commitInfo.changeAdded" :key="index" class="file-item">
                <span class="file-name">{{ file }}</span>
                <el-button type="primary" link @click="removeFiles(file)" size="small" icon="Minus" />
              </div>
            </div>
          </div>
        </div>

        <div slot="footer" class="dialog-footer">
          <el-button @click="commitCodeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCommit" :disabled="!commitInfo.commitMessage || commitInfo.changeAdded.length === 0">提交</el-button>
        </div>
      </el-form>
    </el-dialog>
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
let commitCodeDialogVisible = ref(false);
const cfgStore = usePluginCfgStore();

const listLoading = ref(false);
const list = ref([] as any[]);

const commitInfo = reactive({
  repo: '',
  commitMessage: '',
  remote:'',
  branch:'',
  changeAdded: [] as string[],
  changedFiles: [] as string[],
})

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
const remotesList = ref([] as string[]);

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
const handleCommit = async () => {
  const res = await useCall('WebviewApi.commitFiles', commitInfo.repo ,commitInfo.changeAdded, commitInfo.commitMessage,commitInfo.branch,commitInfo.remote);
  ElMessage.info(String(res));
  commitCodeDialogVisible.value = false;
}

async function openCommitCodeDialog(ownerSlashRepo: string) {
  if (!ownerSlashRepo) {
    return;
  }
  const cfgTarget = cfgStore.targetFolder;
  const currentPath = cfgTarget;
  commitInfo.changedFiles = [];
  commitInfo.changeAdded = [];
  remotesList.value = [];
  branchesList.value = [];
  try {
    commitInfo.repo = ownerSlashRepo;
    const files = await useCall('WebviewApi.getModifiedFiles', ownerSlashRepo, currentPath);
    const rest  = await useCall<string[]>('WebviewApi.getGitRemotes',`${currentPath}/${ownerSlashRepo}`);
    remotesList.value = rest;
    commitInfo.changedFiles = Array.isArray(files) ? files : [];
    commitCodeDialogVisible.value = true;
  } catch (error) {
    console.error('getModifiedFiles error:', error);
  }
}

async function loadBranch(){
  const repoInfo = commitInfo.remote;
  if(!repoInfo){
    ElMessage.error("请先选择远程仓!");
    return;
  }
  const result = repoInfo.replace("https://gitee.com/", "").replace(".git", "");
  console.log(result); 
  const branches = await httpRequest(`repos/${result}/branches`, {
    params: {
      access_token: cfgStore.personalAccessToken,
      page: 1,
      per_page: 20
    }
  }).catch(() => { });
  branchesList.value = [
    ...branchesList.value,
    ...(branches?.dataList || []).map(v => ({
      value: v.name,
      label: v.name
    }))
  ];
}
function addFiles(file: string) {
  commitInfo.changedFiles = commitInfo.changedFiles.filter(item => item !== file);
  commitInfo.changeAdded.push(file);
}

function removeFiles(file: string) {
  commitInfo.changedFiles.push(file);
  commitInfo.changeAdded = commitInfo.changeAdded.filter(item => item !== file);
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
  const loadingInst = ElLoading.service({ fullscreen: true });
  const res: Record<string, unknown> = await useCall('WebviewApi.doCloneRepo', fullName, branch, cfgStore.targetFolder);
  loadingInst.close();
  ElMessage[res?.suc ? 'success' : 'error'](res?.msg || '克隆项目失败：未知错误');
}

async function openInFolder(repoInfo: any, branch: string) {
  const fullName = repoInfo.fullName;
  await useCall('WebviewApi.doOpenInFolder', fullName, branch, cfgStore.targetFolder);
}

async function openInIde(repoInfo: any, branch: string) {
  const fullName = repoInfo.fullName;
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
@use '@/assets/style/common-vars.scss' as *;

:deep(.common-card-footer) {
  @extend %common-card-footer;
  margin-top: 8px;
}

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

.repoButtons {
  margin-top: 20px;
}

.dialog-footer {
  margin-top: 20px;
  margin-right: 20px;
  bottom: 20px;
  right: 20px;
}

.commit-dialog {
  .el-dialog__body {
    padding: 24px;
  }

  .el-dialog__header {
    border-bottom: 1px solid var(--el-border-color-light);
    margin-right: 0;
  }

  .file-lists {
    display: flex;
    gap: 24px;
    margin-top: 16px;
  }

  .file-list {
    flex: 1;
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    padding: 12px;
    max-height: 300px;
    overflow-y: auto;
    background-color: var(--el-bg-color-page);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    h4 {
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      color: var(--el-text-color-primary);
      font-size: 15px;
      font-weight: 500;
    }
  }

  .file-items {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background-color: var(--el-bg-color);
    border-radius: 6px;
    transition: all 0.2s;
    border: 1px solid var(--el-border-color-lighter);

    &:hover {
      background-color: var(--el-fill-color-light);
      border-color: var(--el-color-primary-light-5);
    }

    .file-name {
      flex: 1;
      font-size: 14px;
      color: var(--el-text-color-regular);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
    }

    .el-button {
      margin-left: 8px;
      transition: transform 0.2s;
      
      &:hover {
        transform: scale(1.1);
      }
    }
  }

  .el-form-item {
    margin-bottom: 0;
    
    .el-form-item__label {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  .el-textarea {
    margin-bottom: 16px;
    border-radius: 6px;
    border: 1px solid var(--el-border-color-light);
    transition: border-color 0.2s;

    &:focus-within {
      border-color: var(--el-color-primary);
      box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
    margin-top: 24px;
    gap: 12px;

    .el-button {
      min-width: 80px;
      border-radius: 6px;
    }
  }
}

</style>
