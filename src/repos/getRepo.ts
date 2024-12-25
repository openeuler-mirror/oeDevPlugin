/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import * as https from 'https';
import { getAccessToken } from '../provider/tokenProvider';

(async () => {
  const accessToken = await getAccessToken();
  const apiUrl = `https://gitee.com/api/v5/repos/openeuler/community/git/trees/master?access_token=${accessToken}&recursive=1`;

  interface TreeItem {
    path: string;
    mode: string;
    type: string;
    sha: string;
    size: number;
    url: string;
  }

  interface ApiResponse {
    sha: string;
    url: string;
    tree: TreeItem[];
    truncated: boolean;
  }

  https.get(apiUrl, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const treeData: ApiResponse = JSON.parse(data);

        const yamlFiles = treeData.tree
          .filter(item =>
            (item.path.includes('src-openeuler') || item.path.includes('openeuler')) &&
            item.path.endsWith('.yaml'))
          .map(item => item.path);
        
        // do something with file list
        // yamlFiles.forEach(file => {});

      } catch (error) {
        console.error('Error parsing response:', error);
      }
    });

  }).on('error', (err) => {
    console.error('请求失败: ' + err.message);
  });

})();
