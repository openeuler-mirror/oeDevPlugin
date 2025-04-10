/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

const rpmbuildShell = `#!/bin/bash

set -e

RESET='\\033[0m'
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'

log() {
    local type="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$type" in
        INFO)
            echo -e "\${BLUE}[\${timestamp}] [INFO] \${RESET}\${message}"
            ;;
        SUCCESS)
            echo -e "\${GREEN}[\${timestamp}] [SUCCESS] \${RESET}\${message}"
            ;;
        WARNING)
            echo -e "\${YELLOW}[\${timestamp}] [WARNING] \${RESET}\${message}"
            ;;
        ERROR)
            echo -e "\${RED}[\${timestamp}] [ERROR] \${RESET}\${message}"
            ;;
        *)
            echo -e "\${RESET}[\${timestamp}] [UNKNOWN] \${RESET}\${message}"
            ;;
    esac
}

usage() {
    cat <<EOF
Usage: $0 [options]

Options:
  -r, --repo       Local Git repository path (required)
  -b, --branch     Branch to checkout (default: master)
  -c, --commit     Commit hash to checkout (optional)
  -p, --pr         Pull Request number to fetch (optional)
  -d, --dir        rpmbuild directory (default: ~/rpmbuild)
  -h, --help       Display this help and exit

Example:
  $0 -r /path/to/local/repo -b main -d ~/rpmbuild
EOF
}

die() {
    log "ERROR" "$1"
    exit 1
}

RPMBUILD_DIR=~/rpmbuild
DEFAULT_BRANCH="master"

ARGS=$(getopt -o r:b:c:p:d:h --long repo:,branch:,commit:,pr:,dir:,help -n "$0" -- "$@")
if [ $? -ne 0 ]; then
    usage
    exit 1
fi

eval set -- "$ARGS"

LOCAL_REPO=""
BRANCH="$DEFAULT_BRANCH"
COMMIT=""
PR=""
while true; do
    case "$1" in
        -r|--repo)
            LOCAL_REPO="$2"
            shift 2
            ;;
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        -c|--commit)
            COMMIT="$2"
            shift 2
            ;;
        -p|--pr)
            PR="$2"
            shift 2
            ;;
        -d|--dir)
            RPMBUILD_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --)
            shift
            break
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

if [ -z "$LOCAL_REPO" ]; then
    log "ERROR" "Local Git repository path is required."
    usage
    exit 1
fi

if [ ! -d "$LOCAL_REPO/.git" ]; then
    die "The specified path '$LOCAL_REPO' is not a valid Git repository."
fi

for cmd in git rpmbuild yum-builddep; do
    if ! command -v $cmd &> /dev/null; then
        die "Required command '$cmd' is not found. Please install it."
    fi
done

RPMBUILD_DIR="\${RPMBUILD_DIR/#\~/$HOME}"
log "INFO" "Setting up rpmbuild directory at '$RPMBUILD_DIR'..."
mkdir -p "$RPMBUILD_DIR"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

# 必须是Git仓库
log "INFO" "Cloning repository from '$LOCAL_REPO' to temporary directory..."
git clone "$LOCAL_REPO" "$WORKDIR" || die "Failed to clone repository."

# 获取本地修改的文件列表
MODIFIED_FILES=$(git -C "$LOCAL_REPO" diff --name-only HEAD)
if [ -n "$MODIFIED_FILES" ]; then
    log "INFO" "Copying modified files from local repository..."
    echo "$MODIFIED_FILES" | while read -r file; do
        mkdir -p "$(dirname "$WORKDIR/$file")"
        cp "$LOCAL_REPO/$file" "$WORKDIR/$file" || die "Failed to copy modified file: $file"
    done
    log "SUCCESS" "Copied $(echo "$MODIFIED_FILES" | wc -l) modified files."
else
    log "INFO" "No local modifications found."
fi

cd "$WORKDIR" || die "Failed to enter temporary directory."

if [ -n "$PR" ]; then
    log "INFO" "Fetching PR #$PR..."
    git fetch origin pull/$PR/head:pr-$PR || die "Failed to fetch PR #$PR"
    git checkout pr-$PR || die "Failed to checkout PR branch."
    log "SUCCESS" "Checked out PR #$PR."
elif [ -n "$BRANCH" ]; then
    log "INFO" "Checking out branch '$BRANCH'..."
    git checkout "$BRANCH" || die "Failed to checkout branch '$BRANCH'."
    log "SUCCESS" "Checked out branch '$BRANCH'."
fi

if [ -n "$COMMIT" ]; then
    log "INFO" "Checking out commit '$COMMIT'..."
    git checkout "$COMMIT" || die "Failed to checkout commit '$COMMIT'."
    log "SUCCESS" "Checked out commit '$COMMIT'."
fi

log "INFO" "Listing all files in the repository..."
FILELIST=($(git ls-files))

# 找到唯一的 .spec 文件
SPEC_FILES=()
for pkgfile in "\${FILELIST[@]}"; do
    if [[ "$pkgfile" == *.spec ]]; then
        SPEC_FILES+=("$pkgfile")
    fi
done

SPEC_COUNT=\${#SPEC_FILES[@]}
if [ "$SPEC_COUNT" -eq 0 ]; then
    die "No .spec file found in the repository."
elif [ "$SPEC_COUNT" -gt 1 ]; then
    die "Multiple .spec files found in the repository. Please ensure only one .spec file exists."
else
    SELECTED_SPEC="\${SPEC_FILES[0]}"
    log "INFO" "Found spec file: '$SELECTED_SPEC'."
fi

log "INFO" "Organizing files into SPECS and SOURCES directories..."
for pkgfile in "\${FILELIST[@]}"; do
    if [[ "$pkgfile" == *.spec ]]; then
        DEST_DIR="$RPMBUILD_DIR/SPECS"
    elif [[ "$pkgfile" == */* ]]; then
        DEST_DIR="$RPMBUILD_DIR/SOURCES/$(dirname "$pkgfile")"
    else
        DEST_DIR="$RPMBUILD_DIR/SOURCES"
    fi
    mkdir -p "$DEST_DIR"
    cp --parents "$pkgfile" "$DEST_DIR/" || die "Failed to copy '$pkgfile' to '$DEST_DIR'."
done
log "SUCCESS" "Files organized successfully."

cp "$WORKDIR/$SELECTED_SPEC" "$RPMBUILD_DIR/SPECS/" || die "Failed to copy spec file."

log "INFO" "Installing build dependencies using yum-builddep..."
cd "$RPMBUILD_DIR/SPECS" || die "Failed to enter SPECS directory."
sudo yum-builddep -y "$(basename "$SELECTED_SPEC")" || die "yum-builddep failed."
log "SUCCESS" "Build dependencies installed successfully."

log "INFO" "Building RPM package..."
rpmbuild --define "_topdir $RPMBUILD_DIR" -ba "$(basename "$SELECTED_SPEC")" || die "rpmbuild failed."
log "SUCCESS" "RPM package built successfully."

GENERATED_RPMS=$(find "$RPMBUILD_DIR/RPMS" -type f -name "*.rpm")

if [ -n "$GENERATED_RPMS" ]; then
    log "SUCCESS" "RPM package(s) generated at:"
    echo "$GENERATED_RPMS" | while read -r line; do
        echo -e "\${GREEN}$line\${RESET}"
    done
else
    die "No RPM packages were generated."
fi

exit 0
`;

export const SCRIPT_CONTENT_MAP: Readonly<Map<string, string>> = new Map([
  ['rpmbuild-dev', rpmbuildShell]
]);
