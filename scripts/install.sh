#!/usr/bin/env bash
# 用法: scripts/install.sh "/path/to/your/vault"
# 先 npm run build，再把 main.js / manifest.json / styles.css 复制到 vault 的插件目录。
set -euo pipefail
VAULT="${1:-}"
if [[ -z "$VAULT" || ! -d "$VAULT/.obsidian" ]]; then
  echo "用法: $0 <vault 路径>（该目录下必须有 .obsidian）" >&2
  exit 1
fi
cd "$(dirname "$0")/.."
npm run build
DEST="$VAULT/.obsidian/plugins/slash-tree"
mkdir -p "$DEST"
cp main.js manifest.json styles.css "$DEST/"
echo "已安装到 $DEST"
echo "在 Obsidian 里：设置 → 第三方插件 → 重新加载插件列表 → 启用 Slash Tree"
