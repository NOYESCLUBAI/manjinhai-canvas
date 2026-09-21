import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  PencilLine,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import type {
  TextRewriteApplication,
  TextRewriteSelection,
} from "../types";

type RichTextCardEditorProps = {
  id: string;
  text: string;
  selected: boolean;
  beginChange: () => void;
  selectCard: () => void;
  updateText: (id: string, text: string) => void;
  rewriteApplication?: TextRewriteApplication;
  rewriteBusy: boolean;
  requestRewrite: (selection: TextRewriteSelection) => void;
  completeRewrite: (applicationId: string, error?: string) => void;
};

type FormatButtonProps = {
  label: string;
  active?: boolean;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
};

const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Markdown.configure({
    markedOptions: {
      gfm: true,
      breaks: true,
    },
  }),
];

function FormatButton({
  label,
  active,
  className,
  disabled,
  children,
  onClick,
}: FormatButtonProps) {
  return (
    <button
      className={[className, active ? "is-active" : ""]
        .filter(Boolean)
        .join(" ")}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export function RichTextCardEditor({
  id,
  text,
  selected,
  beginChange,
  selectCard,
  updateText,
  rewriteApplication,
  rewriteBusy,
  requestRewrite,
  completeRewrite,
}: RichTextCardEditorProps) {
  const editingRef = useRef(false);
  const appliedRewriteRef = useRef<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const toolbarPluginKey = `rich-text-toolbar-${id}`;

  const editor = useEditor({
    extensions: editorExtensions,
    content: text,
    contentType: "markdown",
    editable: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "text-card-prosemirror",
        "aria-label": "文字卡片内容",
      },
      handleKeyDown: (view, event) => {
        if (event.key !== "Escape") {
          return false;
        }

        event.preventDefault();
        view.dom.blur();
        setIsEditing(false);
        return true;
      },
    },
    onFocus: () => {
      if (!editingRef.current) {
        editingRef.current = true;
        beginChange();
      }
    },
    onBlur: ({ event }) => {
      editingRef.current = false;
      const nextTarget = event?.relatedTarget;
      if (
        nextTarget instanceof Element &&
        nextTarget.closest(".rich-text-toolbar")
      ) {
        return;
      }
      setIsEditing(false);
    },
    onUpdate: ({ editor: currentEditor }) => {
      updateText(id, currentEditor.getMarkdown());
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const viewport = currentEditor.view.dom.closest(".react-flow__viewport");
      if (viewport) {
        currentEditor.view.dispatch(
          currentEditor.state.tr.setMeta(toolbarPluginKey, "updatePosition"),
        );
      }
    },
  });

  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isEmpty: currentEditor?.isEmpty ?? true,
      isParagraph: currentEditor?.isActive("paragraph") ?? false,
      isHeading1:
        currentEditor?.isActive("heading", { level: 1 }) ?? false,
      isHeading2:
        currentEditor?.isActive("heading", { level: 2 }) ?? false,
      isHeading3:
        currentEditor?.isActive("heading", { level: 3 }) ?? false,
      isBold: currentEditor?.isActive("bold") ?? false,
      isItalic: currentEditor?.isActive("italic") ?? false,
      isBulletList: currentEditor?.isActive("bulletList") ?? false,
      isOrderedList: currentEditor?.isActive("orderedList") ?? false,
    }),
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextText = text || "";
    if (editor.getMarkdown() !== nextText) {
      editor.commands.setContent(nextText, {
        contentType: "markdown",
        emitUpdate: false,
      });
    }
  }, [editor, text]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(isEditing);
    if (!isEditing) {
      editingRef.current = false;
      editor.view.dispatch(
        editor.state.tr.setMeta(toolbarPluginKey, "hide"),
      );
    }
  }, [editor, isEditing, toolbarPluginKey]);

  useEffect(() => {
    if (!selected) {
      setIsEditing(false);
    }
  }, [selected]);

  useEffect(() => {
    if (
      !editor ||
      !rewriteApplication ||
      appliedRewriteRef.current === rewriteApplication.id
    ) {
      return;
    }

    appliedRewriteRef.current = rewriteApplication.id;
    const currentSelectedText = editor.state.doc.textBetween(
      rewriteApplication.from,
      rewriteApplication.to,
      "\n",
    );

    if (currentSelectedText !== rewriteApplication.selectedText) {
      completeRewrite(
        rewriteApplication.id,
        "选中的文字已经发生变化，请重新选择后再改写",
      );
      return;
    }

    beginChange();
    const applied = editor.commands.insertContentAt(
      {
        from: rewriteApplication.from,
        to: rewriteApplication.to,
      },
      rewriteApplication.replacement,
      {
        contentType: "markdown",
        updateSelection: true,
      },
    );

    completeRewrite(
      rewriteApplication.id,
      applied ? undefined : "无法替换当前选区，请重新选择后再试",
    );
  }, [beginChange, completeRewrite, editor, rewriteApplication]);

  useEffect(() => {
    if (!editor || !selected || !isEditing) {
      return;
    }

    const viewport = editor.view.dom.closest(".react-flow__viewport");
    if (!viewport) {
      return;
    }

    let animationFrame = 0;
    const updateToolbarPosition = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          editor.view.dispatch(
            editor.state.tr.setMeta(toolbarPluginKey, "updatePosition"),
          );
        }
      });
    };

    const viewportObserver = new MutationObserver(updateToolbarPosition);
    viewportObserver.observe(viewport, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      viewportObserver.disconnect();
    };
  }, [editor, isEditing, selected, toolbarPluginKey]);

  const openRewriteComposer = () => {
    if (!editor) {
      return;
    }

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    if (from === to || !selectedText.trim()) {
      return;
    }

    editor.view.dispatch(
      editor.state.tr.setMeta(toolbarPluginKey, "hide"),
    );
    setIsEditing(false);

    requestRewrite({
      id: crypto.randomUUID(),
      nodeId: id,
      from,
      to,
      text: selectedText,
      before: editor.state.doc.textBetween(0, from, "\n").slice(-4000),
      after: editor.state.doc
        .textBetween(to, editor.state.doc.content.size, "\n")
        .slice(0, 4000),
      sourceMarkdown: text,
    });
  };

  const startEditing = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    selectCard();

    if (!editor) {
      return;
    }

    const position =
      editor.view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      })?.pos ?? editor.state.selection.from;

    setIsEditing(true);
    requestAnimationFrame(() => {
      if (editor.isDestroyed) {
        return;
      }
      editor.setEditable(true);
      editor.chain().focus().setTextSelection(position).run();
    });
  };

  const stopCanvasWheelWhenScrollable = (
    event: WheelEvent<HTMLDivElement>,
  ) => {
    const editorElement =
      event.currentTarget.querySelector<HTMLElement>(".ProseMirror");
    if (
      editorElement &&
      editorElement.scrollHeight > editorElement.clientHeight
    ) {
      event.stopPropagation();
    }
  };

  return (
    <div
      className={[
        "rich-text-card-editor",
        isEditing ? "nodrag nowheel is-editing" : "is-viewing",
      ].join(" ")}
      data-editing={isEditing ? "true" : "false"}
      onClick={(event) => {
        event.stopPropagation();
        selectCard();
      }}
      onDoubleClick={startEditing}
      onWheel={isEditing ? stopCanvasWheelWhenScrollable : undefined}
    >
      {selected && isEditing && editor && (
        <BubbleMenu
          editor={editor}
          pluginKey={toolbarPluginKey}
          className="rich-text-toolbar nodrag nowheel"
          appendTo={() => document.body}
          shouldShow={({ editor: currentEditor, from, to }) =>
            from !== to &&
            Boolean(currentEditor.state.doc.textBetween(from, to, "\n").trim())
          }
          options={{
            strategy: "fixed",
            placement: "bottom",
            offset: 10,
            flip: true,
            shift: { padding: 12 },
            inline: true,
            hide: true,
            scrollTarget: editor.view.dom,
          }}
          role="toolbar"
          aria-label="文字格式"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <FormatButton
            className="ai-rewrite-format-button"
            label="AI 改写"
            disabled={rewriteBusy}
            onClick={openRewriteComposer}
          >
            <PencilLine size={15} strokeWidth={1.9} />
            <span>AI 改写</span>
          </FormatButton>
          <span className="rich-text-toolbar-divider" aria-hidden="true" />

          <FormatButton
            label="正文"
            active={editorState?.isParagraph}
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            <Pilcrow size={16} strokeWidth={1.9} />
          </FormatButton>
          <FormatButton
            label="一级标题"
            active={editorState?.isHeading1}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <span>H1</span>
          </FormatButton>
          <FormatButton
            label="二级标题"
            active={editorState?.isHeading2}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <span>H2</span>
          </FormatButton>
          <FormatButton
            label="三级标题"
            active={editorState?.isHeading3}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <span>H3</span>
          </FormatButton>

          <span className="rich-text-toolbar-divider" aria-hidden="true" />

          <FormatButton
            label="粗体"
            active={editorState?.isBold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <BoldIcon size={16} strokeWidth={2} />
          </FormatButton>
          <FormatButton
            label="斜体"
            active={editorState?.isItalic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <ItalicIcon size={16} strokeWidth={1.9} />
          </FormatButton>

          <span className="rich-text-toolbar-divider" aria-hidden="true" />

          <FormatButton
            label="无序列表"
            active={editorState?.isBulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={16} strokeWidth={1.9} />
          </FormatButton>
          <FormatButton
            label="有序列表"
            active={editorState?.isOrderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={16} strokeWidth={1.9} />
          </FormatButton>
          <FormatButton
            label="插入分割线"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus size={17} strokeWidth={1.9} />
          </FormatButton>
        </BubbleMenu>
      )}

      {editorState?.isEmpty && (
        <span className="rich-text-placeholder">
          {isEditing ? "写下一段灵感……" : "双击开始编辑…"}
        </span>
      )}
      <EditorContent className="text-card-editor-content" editor={editor} />
    </div>
  );
}
