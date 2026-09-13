import { TREE_ERROR_MESSAGES_EN, TreeErrorMessages } from "./tree";

export type Lang = "en" | "zh";

export interface Strings {
  cmdConvert: string;
  cmdInsert: string;
  menuConvert: string;
  noticeSelectFirst: string;
  errorPrefix: string;
  noticeCopied: string;
  noticeNothingToInsert: string;
  copy: string;
  modalTitle: string;
  modalPlaceholder: string;
  insertButton: string;
  gapName: string;
  gapDesc: string;
  nullName: string;
  nullDesc: string;
  modeName: string;
  modeDesc: string;
  modeLeetcode: string;
  modeHeap: string;
  blockLangName: string;
  blockLangDesc: string;
  outLangName: string;
  outLangDesc: string;
}

const en: Strings = {
  cmdConvert: "Convert selection to slash tree",
  cmdInsert: "Insert slash tree…",
  menuConvert: "Convert to slash tree",
  noticeSelectFirst: "Select the text to convert, or put the cursor on the array line",
  errorPrefix: "Slash tree: ",
  noticeCopied: "Slash tree copied",
  noticeNothingToInsert: "Nothing to insert yet. Enter a valid tree first",
  copy: "Copy",
  modalTitle: "Generate slash tree",
  modalPlaceholder: "Level-order array: [3,9,20,null,null,15,7]\n\nor an indented list:\n1\n  2\n    4\n    5\n  3",
  insertButton: "Insert at cursor (⌘/Ctrl+Enter)",
  gapName: "Minimum subtree gap",
  gapDesc: "How many blank columns to keep between adjacent subtrees. Larger is looser (default 1).",
  nullName: "Null tokens",
  nullDesc: "Comma-separated, case-insensitive. An empty string always counts as an empty node.",
  modeName: "Level-order interpretation",
  modeDesc: "LeetCode: an empty node does not reserve child positions. Heap: the children of index i are always 2i+1 and 2i+2.",
  modeLeetcode: "LeetCode",
  modeHeap: "Heap (complete-tree indices)",
  blockLangName: "Code block language",
  blockLangDesc: "Fence tag whose content is rendered live as a tree in Reading view and Live Preview. Reload the plugin after changing it.",
  outLangName: "Output fence language",
  outLangDesc: "Fence tag used by the convert command, empty by default. Keep it different from the setting above, or the rendered tree would be parsed again.",
};

const zh: Strings = {
  cmdConvert: "把选中文本转换为斜杠树",
  cmdInsert: "输入并插入斜杠树…",
  menuConvert: "转换为斜杠树",
  noticeSelectFirst: "请先选中要转换的文本，或把光标放在数组那一行",
  errorPrefix: "斜杠树：",
  noticeCopied: "已复制斜杠树",
  noticeNothingToInsert: "还没有可插入的树，请先输入正确的格式",
  copy: "复制",
  modalTitle: "生成斜杠树",
  modalPlaceholder: "层序数组：[3,9,20,null,null,15,7]\n\n或缩进列表：\n1\n  2\n    4\n    5\n  3",
  insertButton: "插入到光标处（⌘/Ctrl+Enter）",
  gapName: "子树最小间距",
  gapDesc: "相邻两棵子树之间至少留几列空格，越大越疏松（默认 1）。",
  nullName: "空节点写法",
  nullDesc: "用逗号分隔，不区分大小写；空字符串永远视为空节点。",
  modeName: "层序数组的解释方式",
  modeDesc: "LeetCode：空节点不占用子节点位置。堆式：下标 i 的孩子固定是 2i+1、2i+2。",
  modeLeetcode: "LeetCode",
  modeHeap: "堆式（完全二叉树下标）",
  blockLangName: "自动渲染的代码块语言",
  blockLangDesc: "``` 后面写这个标记，块里的源格式会在阅读视图 / 实时预览中自动渲染成树。修改后需重新加载插件。",
  outLangName: "转换输出的代码块语言",
  outLangDesc: "“转换为斜杠树”命令输出的 ``` 标记，默认为空。不要和上一项相同，否则渲染出来的树会被当作源格式再次解析。",
};

const zhErrors: TreeErrorMessages = {
  empty_input: () => "输入为空",
  root_null: (p) => (p.line ? `第 ${p.line} 行：` : "") + "根节点不能为空",
  orphan_value: (p) => `第 ${p.index} 个值「${p.value}」没有父节点可以挂载`,
  heap_null_parent: (p) => `第 ${p.index} 个值「${p.value}」的父节点（第 ${p.parentIndex} 个）是空节点`,
  placeholder_child: (p) => `第 ${p.line} 行：空节点下面不能再挂孩子`,
  multiple_roots: (p) => `第 ${p.line} 行：只能有一个根节点（缩进是否少了？）`,
  side_taken: (p) => `第 ${p.line} 行：「${p.label}」的${p.side === "L" ? "左" : "右"}孩子已经存在`,
  too_many_children: (p) => `第 ${p.line} 行：「${p.label}」已经有两个孩子了，二叉树最多两个`,
};

export const STRINGS: Record<Lang, Strings> = { en, zh };
export const TREE_ERROR_MESSAGES: Record<Lang, TreeErrorMessages> = { en: TREE_ERROR_MESSAGES_EN, zh: zhErrors };

/** 跟随 Obsidian 的界面语言：简体 / 繁体中文用中文，其余用英文 */
export function detectLang(): Lang {
  try {
    const l = window.localStorage.getItem("language");
    if (l && l.toLowerCase().startsWith("zh")) return "zh";
  } catch (_) {
    // 非浏览器环境（测试）
  }
  return "en";
}
