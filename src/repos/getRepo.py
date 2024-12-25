"""
/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */
"""

import requests

api_url = "https://gitee.com/api/v5/repos/openeuler/community/git/trees/master"
access_token = "0cee3418fbea03dc54152ea364ecefcc"
params = {
    "access_token": access_token,
    "recursive": 1  
}


response = requests.get(api_url, params=params)

if response.status_code == 200:
    tree_data = response.json()

    yaml_files = [
        item['path'] for item in tree_data['tree']
        if ('src-openeuler' in item['path'] or 'openeuler' in item['path'])
        and item['path'].endswith('.yaml')
    ]

    for file in yaml_files:
        print(file)
else:
    print(f"请求失败，状态码：{response.status_code}")
