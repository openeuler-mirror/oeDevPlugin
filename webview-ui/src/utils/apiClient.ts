/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import { CecClient, type MsgObserver, type MsgReceiver, type MsgSender } from 'cec-client-server'

const vscodeApi = (window as any).acquireVsCodeApi()

const msgSender: MsgSender = vscodeApi.postMessage.bind(vscodeApi)
const msgReceiver: MsgReceiver = (msgHandler) => {
  window.addEventListener('message', (evt) => msgHandler(evt.data))
}
const cecClient = new CecClient(msgSender, msgReceiver)

export const useCall = <ReplyVal>(name: string, ...args: any[]) => {
  return cecClient.call<ReplyVal>(name, ...args)
}

export const useSubscribable = (name: string, observer: MsgObserver, ...args: any[]) => {
  return cecClient.subscrible(name, observer, ...args)
}
