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
  <div class="wrap w-full">
    <div class="title">克隆openEuler仓库</div>
    <el-form ref="cloneFormRef" :model="cloneForm" :rules="rules" label-width="200px">
      <el-form-item label="仓库名称" prop="repo">
        <el-select-v2 v-model="cloneForm.repo" filterable :options="repoOptions" value-key="value" class="w-350px"
        @change="() => reqBranches()" />
      </el-form-item>
      <el-form-item label="分支名称" prop="branch">
        <el-select-v2 v-model="cloneForm.branch" filterable :options="branchOptions" value-key="value" class="w-350px" />
      </el-form-item>
      <el-form-item label="当前检出路径" prop="currentPath">
        <el-input class="w-350px" :value="cloneForm.currentPath" readonly required />
      </el-form-item>
      <el-form-item label=" ">
        <el-button type="primary" @click="doClone">克隆仓库</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { usePluginCfgStore } from '@/store/modules/pluginCfg';
import { useOeReposStore } from '@/store/modules/oeRepos';
import { httpRequest } from '@/utils/request';
import { useCall } from '@/utils/apiClient';

const cfgStore = usePluginCfgStore();
const repoStore = useOeReposStore();
const repoList = ref([] as typeof repoStore.repoInfoList);
const repoOptions = computed(() => {
  return repoList.value.map(v => ({
    value: v.ownerSlashRepo,
    label: v.ownerSlashRepo
  }));
});

const cloneFormRef = ref();
const cloneForm = reactive({
  repo: '',
  branch: '',
  currentPath: ''
});
const rules = reactive({
  repo: [{required: true, message: '请选择一个仓库', trigger: 'blur'}],
  branch: [{required: true, message: '请选择一个分支', trigger: 'blur'}],
  currentPath: [{required: true, message: '未设置当前检出目录', trigger: 'change'}]
});

const branchLoading = ref(false);
const branchOptions = ref([] as any[]);
async function reqBranches(pageNo = 1) {
  if (branchLoading.value || !cloneForm.repo) {
    return;
  }
  if (pageNo === 1) {
    branchOptions.value = [];
  }
  branchLoading.value = true;
  const res = await httpRequest(`repos/${cloneForm.repo}/branches`, {
    params: {
      access_token: cfgStore.personalAccessToken,
      page: pageNo,
      per_page: 100
    }
  }).catch(() => {});
  branchLoading.value = false;
  branchOptions.value = [
    ...branchOptions.value,
    ...(res?.dataList || []).map(v => ({
      value: v.name,
      label: v.name
    }))
  ];
  if (Number(res?.dataHeaders?.pages) > pageNo) {
    await reqBranches(pageNo + 1);
  }
}

async function doClone() {
  if (!await cloneFormRef.value?.validate().catch(() => false)) {
    return;
  }
  const loadingInst = ElLoading.service({ fullscreen: true });
  const res: Record<string, unknown> = await useCall('WebviewApi.doCloneRepo', cloneForm.repo, cloneForm.branch, cloneForm.currentPath);
  loadingInst.close();
  ElMessage[res?.suc ? 'success' : 'error'](res?.msg || '克隆项目失败：未知错误');
}

watchEffect(() => {
  const cfgTarget = cfgStore.targetFolder;
  if (cfgTarget !== cloneForm.currentPath) {
    cloneForm.currentPath = cfgTarget || '';
  }
});

watch(() => cfgStore.personalAccessToken, async tkn => {
  if (tkn && repoList.value.length === 0) {
    const loadingInst = ElLoading.service({ fullscreen: true });
    repoList.value = await repoStore.getRepoInfoList();
    loadingInst.close();
  }
}, { immediate: true });
</script>

<style lang="scss" scoped>
.wrap {
  height: calc(100% - 24px);
  margin-top: 24px;
  padding: 16px;
  background-color: var(--el-bg-color-overlay);
}
.title {
  margin-bottom: 12px;
  font-size: 16px;
  line-height: 2;
  font-weight: bold;
}
</style>
