import { App, Editor, Modal, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_NULL_TOKENS, LevelOrderMode, TreeError, formatTreeError, textToTree } from "./tree";
import { Lang, STRINGS, Strings, TREE_ERROR_MESSAGES, detectLang } from "./i18n";

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

export default class SlashTreePlugin extends Plugin {
  settings: SlashTreeSettings = { ...DEFAULT_SETTINGS };
  lang: Lang = "en";
  t: Strings = STRINGS.en;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.lang = detectLang();
    this.t = STRINGS[this.lang];

    // 命令 1：把选中文本（或光标所在行）原地替换成斜杠树
    this.addCommand({
      id: "convert-selection",
      name: this.t.cmdConvert,
      editorCallback: (editor) => this.convertSelection(editor),
    });

    // 命令 2：弹窗输入 + 实时预览，再插入到光标处
    this.addCommand({
      id: "insert-from-modal",
      name: this.t.cmdInsert,
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
            .setTitle(this.t.menuConvert)
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

  errorMessage(e: unknown): string {
    if (e instanceof TreeError) return formatTreeError(e, TREE_ERROR_MESSAGES[this.lang]);
    return e instanceof Error ? e.message : String(e);
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
      new Notice(this.t.noticeSelectFirst);
      return;
    }

    let tree: string;
    try {
      tree = this.convert(text);
    } catch (e) {
      new Notice(this.t.errorPrefix + this.errorMessage(e), 6000);
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
      el.createDiv({ cls: "slash-tree-error", text: this.t.errorPrefix + this.errorMessage(e) });
      return;
    }
    const wrapper = el.createDiv({ cls: "slash-tree" });
    wrapper.createEl("pre", { cls: "slash-tree-pre", text: tree });
    const copy = wrapper.createEl("button", { cls: "slash-tree-copy", text: this.t.copy });
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(tree);
      new Notice(this.t.noticeCopied);
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
    const t = this.plugin.t;
    this.titleEl.setText(t.modalTitle);
    contentEl.addClass("slash-tree-modal");

    const input = contentEl.createEl("textarea", {
      cls: "slash-tree-input",
      attr: { rows: "7", placeholder: t.modalPlaceholder },
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
        error.setText(this.plugin.errorMessage(e));
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
    const copy = buttons.createEl("button", { text: t.copy });
    copy.addEventListener("click", async () => {
      if (!this.tree) return;
      await navigator.clipboard.writeText(this.tree);
      new Notice(t.noticeCopied);
    });
    const insert = buttons.createEl("button", { text: t.insertButton, cls: "mod-cta" });
    insert.addEventListener("click", () => this.insert());

    input.focus();
  }

  private insert(): void {
    if (!this.tree) {
      new Notice(this.plugin.t.noticeNothingToInsert);
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
    const t = this.plugin.t;

    new Setting(containerEl)
      .setName(t.gapName)
      .setDesc(t.gapDesc)
      .addText((text) =>
        text.setValue(String(s.minGap)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (!Number.isNaN(n) && n >= 1) {
            s.minGap = n;
            await this.plugin.saveSettings();
          }
        })
      );

    new Setting(containerEl)
      .setName(t.nullName)
      .setDesc(t.nullDesc)
      .addText((text) =>
        text.setValue(s.nullTokens).onChange(async (v) => {
          s.nullTokens = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t.modeName)
      .setDesc(t.modeDesc)
      .addDropdown((d) =>
        d
          .addOption("leetcode", t.modeLeetcode)
          .addOption("heap", t.modeHeap)
          .setValue(s.levelOrderMode)
          .onChange(async (v) => {
            s.levelOrderMode = v as LevelOrderMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t.blockLangName)
      .setDesc(t.blockLangDesc)
      .addText((text) =>
        text.setValue(s.codeBlockLanguage).onChange(async (v) => {
          s.codeBlockLanguage = v.trim() || "tree";
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t.outLangName)
      .setDesc(t.outLangDesc)
      .addText((text) =>
        text.setValue(s.outputFenceLanguage).onChange(async (v) => {
          s.outputFenceLanguage = v.trim();
          await this.plugin.saveSettings();
        })
      );
  }
}
