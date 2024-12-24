/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import { createRouter, createMemoryHistory } from "vue-router";
const DemoLayout = () => import('@/layout/DemoLayout.vue')

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: "/",
      component: DemoLayout,
      children: [
        {
          path: "issues",
          name: "Issues",
          component: () => import("@/views/Issues.vue"),
        },
        {
          path: "pullrequests",
          name: "PullRequests",
          component: () => import('@/views/PullRequests.vue'),
        },
        {
          path: "clone",
          name: "Clone",
          component: () => import("@/views/Clone.vue"),
        },
        {
          path: "myrepos",
          name: "MyRepos",
          component: () => import("@/views/MyRepos.vue"),
        },
        {
          path: "communitys",
          name: "Communitys",
          component: () => import("@/views/Communitys.vue"),
        },
        {
          path: "openeuler",
          name: "Openeuler",
          component: () => import("@/views/OpenEuler.vue"),
        }
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', redirect: '/' },
  ],
});

export default router;
