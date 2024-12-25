/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import axios, { AxiosResponse } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { usePluginCfgStore } from '@/store/modules/pluginCfg';

const ALERT_CODE_MSG_MAP: Readonly<Map<number, string>> = new Map([
  [401, '授权超时，请检查Gitee私人令牌配置']
]);

const doAlert = (msg: string) => {
  ElMessage.error(msg);
};

// 创建一个 axios 实例
const service = axios.create({
  baseURL: 'https://gitee.com/api/v5', // 所有的请求地址前缀部分
  timeout: 20000, // 请求超时时间毫秒
  // 'withCredentials': true, // 异步请求携带cookie
  headers: {
    // 设置后端需要的传参类型
  }
});
// 添加请求拦截器
service.interceptors.request.use(
  // 在发送请求之前做些什么
  config => {
    const store = usePluginCfgStore();
    if (store.personalAccessToken) {
      config.params = {
        ...(config.params || {}),
        access_token: store.personalAccessToken
      };
    }
    return config;
  },

  // 对请求错误做些什么
  (error) => Promise.reject(error)
);

// 添加响应拦截器
service.interceptors.response.use(
  response => {
    // 2xx 范围内的状态码都会触发该函数。
    // response.data 是 axios 返回数据中的 data
    let dataAxios = response.data;
    const headers = response.headers;
    const headerData = {
      total: headers['total_count'] || 0,
      pages: headers['total_page'] || 0
    };
    if (Array.isArray(dataAxios)) {
      dataAxios = {
        dataList: dataAxios,
        dataHeaders: headerData
      }
    }
    return dataAxios;
  },
  error => {
    // 超出 2xx 范围的状态码都会触发该函数。
    // 对响应错误做点什么
    const resp = error?.response || {};
    const errCode = resp.status;
    let msg = resp.message;
    if (ALERT_CODE_MSG_MAP.has(errCode)) {
      msg = ALERT_CODE_MSG_MAP.get(errCode) as string;
    }
    msg = `网络请求失败：${msg || '未知错误'}`;
    doAlert(msg);
    return Promise.reject(error);
  }
);

export function httpRequest(
  urlParam: string | AxiosRequestConfig,
  param?: AxiosRequestConfig
): Promise<AxiosResponse['data']> {
  if (typeof urlParam === 'string') {
    return service(urlParam, param);
  }
  return service(urlParam);
}
