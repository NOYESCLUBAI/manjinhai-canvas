import {
  Copy,
  GripVertical,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Trash2,
  Search,
  FileText,
  Image,
  Film,
  Layers,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ProjectCanvas, CanvasNode, CardKind } from "../types";

type CanvasSidebarProps = {
  canvases: ProjectCanvas[];
  activeCanvasId: string;
  onClose: () => void;
  onCreate: () => void;
  onSelect: (canvasId: string) => void;
  onRename: (canvasId: string, title: string) => void;
  onDuplicate: (canvasId: string) => void;
  onDelete: (canvasId: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  nodes: CanvasNode[];
  onSelectNode: (id: string) => void;
};

export function CanvasSidebar({
  canvases,
  activeCanvasId,
  onClose,
  onCreate,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onReorder,
  nodes,
  onSelectNode,
}: CanvasSidebarProps) {
  const [tab, setTab] = useState<"elements" | "canvases">("elements");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CardKind | "all">("all");
  const labels = { text: "文字", image: "图片", video: "视频" };
  const visibleNodes = nodes.filter(node =>
    (filter === "all" || node.data.kind === filter) &&
    `${node.data.text || ""} ${node.data.fileName || ""} ${labels[node.data.kind]}`.toLowerCase().includes(query.toLowerCase()),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const sidebarRef = useRef<HTMLElement>(null);
  const deleteCandidate = canvases.find(
    (canvas) => canvas.id === deleteCandidateId,
  );

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (
        menuId &&
        !(event.target as HTMLElement).closest(".canvas-sidebar-row-actions")
      ) {
        setMenuId(null);
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuId]);

  const beginRename = (canvas: ProjectCanvas) => {
    setMenuId(null);
    setEditingId(canvas.id);
    setDraftTitle(canvas.title);
  };

  const finishRename = () => {
    if (!editingId) {
      return;
    }
    onRename(editingId, draftTitle);
    setEditingId(null);
  };

  return (
    <aside className="canvas-sidebar" ref={sidebarRef} aria-label="项目画布">
      <header className="canvas-sidebar-header">
        <div>
          <Layers size={16} />
          <strong>{canvases.find(canvas => canvas.id === activeCanvasId)?.title || "画布"}</strong>
        </div>
        <div className="canvas-sidebar-header-actions">
          <button type="button" onClick={onCreate} title="新建画布">
            <Plus size={17} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={onClose} title="收起画布列表">
            <PanelLeftClose size={17} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <div className="sidebar-tabs" role="tablist" aria-label="目录类型">
        <button type="button" role="tab" aria-selected={tab === "elements"} onClick={() => setTab("elements")}>画布元素 <span>{nodes.length}</span></button>
        <button type="button" role="tab" aria-selected={tab === "canvases"} onClick={() => setTab("canvases")}>项目画布</button>
      </div>
      {tab === "elements" && <>
        <div className="element-search"><Search size={14} /><input aria-label="搜索画布元素" placeholder="搜索元素…" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <div className="element-filter"><span>当前画布</span><select aria-label="元素类型" value={filter} onChange={event => setFilter(event.target.value as CardKind | "all")}><option value="all">全部类型</option><option value="text">文字</option><option value="image">图片</option><option value="video">视频</option></select></div>
        <div className="element-list">
          {visibleNodes.map(node => {
            const Icon = node.data.kind === "text" ? FileText : node.data.kind === "image" ? Image : Film;
            const index = nodes.filter(item => item.data.kind === node.data.kind).findIndex(item => item.id === node.id) + 1;
            const title = `${labels[node.data.kind]}节点 ${index}`;
            return <button className={`element-row ${node.selected ? "is-selected" : ""}`} type="button" key={node.id} aria-label={title} aria-pressed={!!node.selected} onClick={() => onSelectNode(node.id)}>
              <span className="element-thumbnail">{node.data.kind === "image" && node.data.assetUrl ? <img src={node.data.assetUrl} alt="" /> : <Icon size={17} strokeWidth={1.5} />}</span>
              <span className="element-label"><strong>{title}</strong><small>{(node.data.text || node.data.fileName || "等待创作").replace(/[#*\n]/g, " ").slice(0, 40)}</small></span>
            </button>;
          })}
          {visibleNodes.length === 0 && <p className="element-empty">{nodes.length ? "没有匹配的元素" : "从底部 + 添加第一个节点"}</p>}
        </div>
      </>}

      <ol className="canvas-sidebar-list" hidden={tab !== "canvases"}>
        {canvases.map((canvas, index) => {
          const active = canvas.id === activeCanvasId;
          const editing = canvas.id === editingId;
          const menuOpen = canvas.id === menuId;

          return (
            <li
              key={canvas.id}
              className={[
                "canvas-sidebar-row",
                active ? "is-active" : "",
                draggingId === canvas.id ? "is-dragging" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={!editing}
              onDragStart={(event) => {
                setDraggingId(canvas.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", canvas.id);
              }}
              onDragOver={(event) => {
                if (draggingId && draggingId !== canvas.id) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId =
                  draggingId || event.dataTransfer.getData("text/plain");
                if (sourceId && sourceId !== canvas.id) {
                  onReorder(sourceId, canvas.id);
                }
                setDraggingId(null);
              }}
              onDragEnd={() => setDraggingId(null)}
            >
              <GripVertical
                className="canvas-sidebar-drag"
                size={14}
                strokeWidth={1.7}
                aria-hidden="true"
              />
              <span className="canvas-sidebar-index">
                {String(index + 1).padStart(2, "0")}
              </span>

              {editing ? (
                <input
                  autoFocus
                  value={draftTitle}
                  aria-label="画布名称"
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onBlur={finishRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <button
                  className="canvas-sidebar-row-main"
                  type="button"
                  onClick={() => onSelect(canvas.id)}
                  onDoubleClick={() => beginRename(canvas)}
                  title={canvas.title}
                  aria-current={active ? "page" : undefined}
                >
                  <span>{canvas.title}</span>
                </button>
              )}

              {!editing && (
                <div className="canvas-sidebar-row-actions">
                  <button
                    type="button"
                    aria-label={`${canvas.title}操作`}
                    aria-expanded={menuOpen}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuId((current) =>
                        current === canvas.id ? null : canvas.id,
                      );
                    }}
                  >
                    <MoreHorizontal size={16} strokeWidth={1.8} />
                  </button>

                  {menuOpen && (
                    <div className="canvas-sidebar-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => beginRename(canvas)}
                      >
                        <Pencil size={14} strokeWidth={1.8} />
                        重命名
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuId(null);
                          onDuplicate(canvas.id);
                        }}
                      >
                        <Copy size={14} strokeWidth={1.8} />
                        创建副本
                      </button>
                      <button
                        className="danger-action"
                        type="button"
                        role="menuitem"
                        disabled={canvases.length === 1}
                        onClick={() => {
                          setMenuId(null);
                          setDeleteCandidateId(canvas.id);
                        }}
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                        删除画布
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <button className="canvas-sidebar-create" type="button" onClick={onCreate}>
        <Plus size={15} strokeWidth={1.8} />
        新建画布
      </button>

      {deleteCandidate && (
        <div
          className="canvas-delete-confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="canvas-delete-title"
        >
          <div>
            <strong id="canvas-delete-title">删除“{deleteCandidate.title}”？</strong>
            <p>画布中的卡片和连线会从项目中移除。</p>
          </div>
          <div className="canvas-delete-confirm-actions">
            <button
              type="button"
              onClick={() => setDeleteCandidateId(null)}
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteCandidateId(null);
                onDelete(deleteCandidate.id);
              }}
            >
              删除
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
