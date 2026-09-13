import { App, Editor, Modal, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_NULL_TOKENS, LevelOrderMode, TreeError, textToTree } from "./tree";

interface SlashTreeSettings {
  minGap: number;
  nullTokens: string;
  levelOrderMode: LevelOrderMode;
  codeBlockLanguage: string;
  outputFenceLanguage: string;
}

const DEFAULT_SETTINGS: SlashTreeSettings = {
  minGap: 1,
  nullTokens: DEFAULT_NULL_TOKENS.join(", "),
  levelOrderMode: "leetcode",
  codeBlockLanguage: "tree",
  outputFenceLanguage: "",
};

function errorMessage(e: unknown): string {
  if (e instanceof TreeError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

export default class SlashTreePlugin extends Plugin {
  settings: SlashTreeSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();

    // 命令 1：把选中文本（或光标所在行）原地替换成斜杠树
    this.addCommand({
      id: "convert-selection",
      name: "把选中文本转换为斜杠树",
      editorCallback: (editor) => this.convertSelection(editor),
    });

    // 命令 2：弹窗输入 + 实时预览，再插入到光标处
    this.addCommand({
      id: "insert-from-modal",
      name: "输入并插入斜杠树…",
      editorCallback: (editor) => {
        new TreeInputModal(this, (tree) => {
          const cursor = editor.getCursor();
          const prefix = cursor.ch > 0 ? "\n" : "";
          editor.replaceSelection(prefix + this.wrapInFence(tree) + "\n");
        }).open();
      },
    });

    // 代码块：```tree 里写源格式，阅读视图 / 实时预览中自动渲染成树
    const lang = this.settings.codeBlockLanguage.trim() || "tree";
    this.registerMarkdownCodeBlockProcessor(lang, (source, el) => this.renderCodeBlock(source, el));

    // 右键菜单：有选区时显示
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        if (!editor.getSelection()) return;
        menu.addItem((item) =>
          item
            .setTitle("转换为斜杠树")
            .setIcon("git-fork")
            .onClick(() => this.convertSelection(editor))
        );
      })
    );

    this.addSettingTab(new SlashTreeSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** 文本 -> 字符画（使用当前设置） */
  convert(text: string): string {
    return textToTree(text, {
      minGap: this.settings.minGap,
      nullTokens: this.settings.nullTokens.split(",").map((t) => t.trim()).filter(Boolean),
      levelOrderMode: this.settings.levelOrderMode,
    });
  }

  wrapInFence(tree: string): string {
    const lang = this.settings.outputFenceLanguage.trim();
    return "```" + lang + "\n" + tree + "\n```";
  }

  convertSelection(editor: Editor): void {
    const selection = editor.getSelection();
    const cursor = editor.getCursor();
    const text = selection || editor.getLine(cursor.line);
    if (!text.trim()) {
      new Notice("请先选中要转换的文本，或把光标放在数组那一行");
      return;
    }

    let tree: string;
    try {
      tree = this.convert(text);
    } catch (e) {
      new Notice("斜杠树：" + errorMessage(e), 6000);
      return;
    }

    const out = this.wrapInFence(tree);
    if (selection) {
      editor.replaceSelection(out);
    } else {
      editor.replaceRange(out, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: text.length });
    }
  }

  renderCodeBlock(source: string, el: HTMLElement): void {
    let tree: string;
    try {
      tree = this.convert(source);
    } catch (e) {
      el.createDiv({ cls: "slash-tree-error", text: "斜杠树：" + errorMessage(e) });
      return;
    }
    const wrapper = el.createDiv({ cls: "slash-tree" });
    wrapper.createEl("pre", { cls: "slash-tree-pre", text: tree });
    const copy = wrapper.createEl("button", { cls: "slash-tree-copy", text: "复制" });
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(tree);
      new Notice("已复制斜杠树");
    });
  }
}

class TreeInputModal extends Modal {
  private tree = "";

  constructor(private plugin: SlashTreePlugin, private onInsert: (tree: string) => void) {
    super(plugin.app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("slash-tree-modal");
    contentEl.createEl("h3", { text: "生成斜杠树" });

    const input = contentEl.createEl("textarea", {
      cls: "slash-tree-input",
      attr: {
        rows: "7",
        placeholder: "层序数组：[3,9,20,null,null,15,7]\n\n或缩进列表：\n1\n  2\n    4\n    5\n  3",
      },
    });
    const preview = contentEl.createEl("pre", { cls: "slash-tree-pre slash-tree-preview" });
    const error = contentEl.createDiv({ cls: "slash-tree-error" });

    const update = () => {
      const text = input.value;
      try {
        this.tree = text.trim() ? this.plugin.convert(text) : "";
        preview.setText(this.tree);
        error.setText("");
      } catch (e) {
        this.tree = "";
        preview.setText("");
        error.setText(errorMessage(e));
      }
    };
    input.addEventListener("input", update);
    input.addEventListener("keydown", (ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
        ev.preventDefault();
        this.insert();
      }
    });

    const buttons = contentEl.createDiv({ cls: "slash-tree-buttons" });
    const copy = buttons.createEl("button", { text: "复制" });
    copy.addEventListener("click", async () => {
      if (!this.tree) return;
      await navigator.clipboard.writeText(this.tree);
      new Notice("已复制斜杠树");
    });
    const insert = buttons.createEl("button", { text: "插入到光标处（⌘/Ctrl+Enter）", cls: "mod-cta" });
    insert.addEventListener("click", () => this.insert());

    input.focus();
  }

  private insert(): void {
    if (!this.tree) {
      new Notice("还没有可插入的树，请先输入正确的格式");
      return;
    }
    this.onInsert(this.tree);
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class SlashTreeSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SlashTreePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    new Setting(containerEl)
      .setName("子树最小间距")
      .setDesc("相邻两棵子树之间至少留几列空格，越大越疏松（默认 1）。")
      .addText((t) =>
        t.setValue(String(s.minGap)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (!Number.isNaN(n) && n >= 1) {
            s.minGap = n;
            await this.plugin.saveSettings();
          }
        })
      );

    new Setting(containerEl)
      .setName("空节点写法")
      .setDesc("用逗号分隔，不区分大小写；空字符串永远视为空节点。")
      .addText((t) =>
        t.setValue(s.nullTokens).onChange(async (v) => {
          s.nullTokens = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("层序数组的解释方式")
      .setDesc("LeetCode：空节点不占用子节点位置。堆式：下标 i 的孩子固定是 2i+1、2i+2。")
      .addDropdown((d) =>
        d
          .addOption("leetcode", "LeetCode")
          .addOption("heap", "堆式（完全二叉树下标）")
          .setValue(s.levelOrderMode)
          .onChange(async (v) => {
            s.levelOrderMode = v as LevelOrderMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("自动渲染的代码块语言")
      .setDesc("``` 后面写这个标记，块里的源格式会在阅读视图 / 实时预览中自动渲染成树。修改后需重新加载插件。")
      .addText((t) =>
        t.setValue(s.codeBlockLanguage).onChange(async (v) => {
          s.codeBlockLanguage = v.trim() || "tree";
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("转换输出的代码块语言")
      .setDesc("“转换为斜杠树”命令输出的 ``` 标记，默认为空。不要和上一项相同，否则渲染出来的树会被当作源格式再次解析。")
      .addText((t) =>
        t.setValue(s.outputFenceLanguage).onChange(async (v) => {
          s.outputFenceLanguage = v.trim();
          await this.plugin.saveSettings();
        })
      );
  }
}
