<template>
    <el-dialog v-model="dialogVisible" class="createPullRequest" title="创建Pull Request" width="600px" height="580px">
        <el-form class="grid-form">
            <el-form-item class="grid-item" label="目标仓库">
                <el-select-v2 v-model="repoName" filterable :options="repoOptions" value-key="value"
                    @change="getForkedFromRepo(repoName)" class="PR-Repo">
                </el-select-v2>
            </el-form-item>
            <el-form-item class="grid-item" label="源分支">
                <el-select-v2 v-model="sourceBranch" filterable :options="srcBranchOptions"
                    @focus="loadSrcBranchData(repoName)" value-key="value" class="PR-Head">
                </el-select-v2>
            </el-form-item>
            <el-form-item class="grid-item" label="目标分支">
                <el-select-v2 v-model="destBranch" filterable :options="destBranchOptions"
                    @focus="loadDestBranchData(forkedfromRepo)" value-key="value" class="PR-Base">
                </el-select-v2>
            </el-form-item>
            <el-form-item class="grid-item" label="title">
                <el-input v-model="title" placeholder="请输入title" class="PR-tt"></el-input>
            </el-form-item>
            <el-form-item class="grid-item" label="description">
                <el-input v-model="description" placeholder="请输入description" class="PR-desc"></el-input>
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="createPullRequest(repoInfo)">创建PR</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import { useOeReposStore } from '@/store/modules/oeRepos';
import { usePluginCfgStore } from '@/store/modules/pluginCfg';
import { useCall } from '@/utils/apiClient';
import { httpRequest } from '@/utils/request';

interface forkedRepoInfo {
    id: number;
    public: boolean;
    humanName: string;
    fullName: string;
    fork: boolean;
    description: string;
    updatedAt: string;
    htmlUrl: string;
    forkHumanName: string;
}

const repoStore = useOeReposStore();
const cfgStore = usePluginCfgStore();
const repoList = ref([] as typeof repoStore.repoInfoList);
const srcBranchOptions = ref([] as string[]);
const destBranchOptions = ref([] as string[]);
let repoInfo: forkedRepoInfo = {
    id: 0,
    public: false,
    humanName: '',
    fullName: '',
    fork: false,
    description: '',
    updatedAt: '',
    htmlUrl: '',
    forkHumanName: ''
};
const repoOptions = computed(() => {
    return list.value.map(v => ({
        value: v.fullName,
        label: v.humanName
    }));
});

const repoName = ref('');
const forkedfromRepo = ref('');
const sourceBranch = ref('');
const destBranch = ref('');
const title = ref('');
const description = ref('');
let dialogVisible = ref(false);
const listLoading = ref(false);
const list = ref([] as forkedRepoInfo[]);
const srcBranchflag = ref(false);
const destBranchflag = ref(false);

onMounted(() => {
    dialogVisible.value = true;
})

watch(() => cfgStore.personalAccessToken, async tkn => {
    if (tkn && repoList.value.length === 0) {
        const loadingInst = ElLoading.service({ fullscreen: true });
        repoList.value = await repoStore.getRepoInfoList();
        await reqForkedRepo();
        loadingInst.close();
    }
}, { immediate: true })

async function reqForkedRepo() {
    if (listLoading.value) {
        return;
    }
    listLoading.value = true;
    const res = await httpRequest(`user/repos`, {
        params: {
            access_token: cfgStore.personalAccessToken,
            sort: 'updated',
            page: 1,
            per_page: 20
        }
    }).catch(() => { });
    listLoading.value = false;
    list.value = [
        ...(res?.dataList || []).map(v => ({
            id: v.id,
            public: v.public,
            humanName: v.human_name,
            fullName: v.full_name,
            fork: v.fork,
            description: v.description,
            updatedAt: v.updated_at,
            htmlUrl: v.html_url,
            forkHumanName: v.parent?.human_name || '',
        }))
    ];
}

function getForkedFromRepo(repoName: string) {
    if (list.value.length === 0) {
        return;
    }
    srcBranchflag.value = false;
    destBranchflag.value = false;
    repoInfo = list.value.find(v => v.fullName === repoName) || repoInfo;
    forkedfromRepo.value = repoInfo.forkHumanName;
}

const loadSrcBranchData = async (repoInfo: string) => {
    if (!repoInfo) {
        ElMessage("请选择仓库");
        return;
    }
    if (srcBranchflag.value) {
        return;
    }
    srcBranchflag.value = true;
    srcBranchOptions.value = [];
    const branch = await httpRequest(`repos/${repoInfo}/branches`, {
        params: {
            access_token: cfgStore.personalAccessToken,
            page: 1,
            per_page: 20
        }
    }).catch(() => { });
    srcBranchOptions.value = [
        ...srcBranchOptions.value,
        ...(branch?.dataList || []).map(v => ({
            value: v.name,
            label: v.name
        }))
    ];
}

const loadDestBranchData = async (repoInfo: string) => {
    if (!repoInfo) {
        ElMessage("请选择仓库");
        return;
    }
    if (destBranchflag.value) {
        return;
    }
    destBranchflag.value = true;
    destBranchOptions.value = [];
    const branch = await httpRequest(`repos/${repoInfo}/branches`, {
        params: {
            access_token: cfgStore.personalAccessToken,
            page: 1,
            per_page: 20
        }
    }).catch(() => { });
    destBranchOptions.value = [
        ...destBranchOptions.value,
        ...(branch?.dataList || []).map(v => ({
            value: v.name,
            label: v.name
        }))
    ];
}

async function createPullRequest(repoInfo: forkedRepoInfo) {
    if (!repoInfo) {
        ElMessage("请完善信息");
        return;
    }
    const owner = repoInfo.forkHumanName.split('/')[0];
    const repo = repoInfo.humanName.split('/')[1];
    const titleInfo = title.value;
    const descriptionInfo = description.value;
    const head = repoInfo.fullName.split('/')[0] + ":" + sourceBranch.value;
    const base = destBranch.value;
    const response = JSON.parse(await useCall('WebviewApi.createPullRequest'));
    if(response.err){
        ElMessage("创建pull request失败");
    }
}
</script>

<style lang="scss" scoped>
.container {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: 20px
}

.el-form-item {
    display: contents;
}

.el-form-item label {
    width: 80px;
    text-align: right;
}

.el-select-v2 .el-input {
    grid-column: 2;
}
</style>