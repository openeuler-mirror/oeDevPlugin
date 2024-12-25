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
  <div class="tab-bar-line">
    <div
      v-for="item in tabs" :key="item.value" :class="{'tab-active': item.value === active}"
      @click="changeActiveTab(item.value)"
    >
      {{ item.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  tabs: Array<{label: string, value: string}>,
  active: string
}>();
const emit = defineEmits(['tab-change']);

const changeActiveTab = (val: string) => {
    emit('tab-change', val);
};
</script>

<style lang="scss" scoped>
.tab-bar-line {
  display: flex;
  max-height: 40px;
  min-height: 40px;
  overflow: hidden;

  > div {
    max-width: 200px;
    font-size: 14px;
    height: 40px;
    line-height: 36px;
    padding: 0 24px 4px;
    background-color: var(--el-bg-color-overlay);
    margin-right: 4px;
    transition: all 0.3s;
    cursor: pointer;
    border-radius: 1px 1px 0 0;
    word-break: keep-all;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      width: 100%;
      height: 4px;
      bottom: 0;
      background-color: var(--el-bg-color-page);
    }
  }

  > div.tab-active {
    color: #0077ff;

    &::after {
      background-color: var(--el-bg-color-overlay);
    }
  }
}
</style>
