import { ChoicePopover } from "./ChoicePopover";
import { modelLabel } from "../lib/modelConfigs";
import {
  ArrowUp,
  Check,
  FileText,
  LoaderCircle,
  Plus,
  RotateCcw,
  TextQuote,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import type { TextReference } from "../lib/textWriter";

type TextWriterDockProps = {
  prompt: string;
  modelName: string;
  modelOptions: string[];
  referenceOptions: TextReference[];
  initialReferenceIds: string[];
  busy: boolean;
  rewriteSelection?: {
    text: string;
  };
  focusVersion: number;
  feedback?: {
    type: "success" | "error";
    text: string;
  };
  canUndo: boolean;
  undoLabel: string;
  onPromptChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onReferencesChange: (referenceIds: string[]) => void;
  onSubmit: (referenceIds: string[]) => void;
  onClearRewrite: () => void;
  onUndo: () => void;
};

const MAX_REFERENCES = 5;

function summarizeReference(text: string) {
  const summary = text.replace(/\s+/g, " ").trim();
  return summary.length > 28 ? `${summary.slice(0, 28)}…` : summary;
}

export function TextWriterDock({
  prompt,
  modelName,
  modelOptions,
  referenceOptions,
  initialReferenceIds,
  busy,
  rewriteSelection,
  focusVersion,
  feedback,
  canUndo,
  undoLabel,
  onPromptChange,
  onModelChange,
  onReferencesChange,
  onSubmit,
  onClearRewrite,
  onUndo,
}: TextWriterDockProps) {
  const [referenceMenuOpen, setReferenceMenuOpen] = useState(false);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>(
    () => initialReferenceIds.slice(0, MAX_REFERENCES),
  );
  const referenceAreaRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const selectedReferences = useMemo(
    () =>
      selectedReferenceIds
        .map((id) => referenceOptions.find((reference) => reference.id === id))
        .filter((reference): reference is TextReference => Boolean(reference)),
    [referenceOptions, selectedReferenceIds],
  );

  useEffect(() => {
    if (!referenceMenuOpen) {
      return;
    }

    const closeOutside = (event: PointerEvent) => {
      if (
        referenceAreaRef.current &&
        !referenceAreaRef.current.contains(event.target as Node)
      ) {
        setReferenceMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [referenceMenuOpen]);

  useEffect(() => {
    if (rewriteSelection && focusVersion > 0) {
      promptRef.current?.focus();
    }
  }, [focusVersion, rewriteSelection]);

  useEffect(() => {
    const next = initialReferenceIds.slice(0, MAX_REFERENCES);
    setSelectedReferenceIds((current) =>
      current.length === next.length &&
      current.every((id, index) => id === next[index])
        ? current
        : next,
    );
  }, [initialReferenceIds]);

  const toggleReference = (id: string) => {
    const next = selectedReferenceIds.includes(id)
      ? selectedReferenceIds.filter((referenceId) => referenceId !== id)
      : selectedReferenceIds.length >= MAX_REFERENCES
        ? selectedReferenceIds
        : [...selectedReferenceIds, id];
    if (next === selectedReferenceIds) {
      return;
    }
    setSelectedReferenceIds(next);
    onReferencesChange(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(selectedReferences.map((reference) => reference.id));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "@") {
      event.preventDefault();
      setReferenceMenuOpen(true);
      return;
    }

    if (event.key === "Escape" && referenceMenuOpen) {
      event.preventDefault();
      setReferenceMenuOpen(false);
      return;
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit(selectedReferences.map((reference) => reference.id));
    }
  };

  return (
    <form className="text-writer-dock" onSubmit={submit}>
      <div className="text-writer-context">
        <span className="text-writer-card-icon">
          <FileText size={15} strokeWidth={1.75} />
        </span>
        <span>
          {rewriteSelection ? "修改选中文字" : "生成当前文字卡片内容"}
        </span>
        {feedback && (
          <span className={`text-writer-feedback is-${feedback.type}`}>
            {feedback.text}
          </span>
        )}
      </div>

      <div className="text-writer-reference-area" ref={referenceAreaRef}>
        <div className="text-writer-reference-row">
          <button
            className={`text-reference-add ${referenceMenuOpen ? "is-open" : ""}`}
            type="button"
            aria-label="引用其他文字卡片"
            aria-expanded={referenceMenuOpen}
            disabled={busy}
            onClick={() => setReferenceMenuOpen((open) => !open)}
          >
            <Plus size={15} strokeWidth={1.9} />
          </button>

          {rewriteSelection && (
            <span className="text-reference-chip text-rewrite-selection-chip">
              <TextQuote size={13} strokeWidth={1.9} aria-hidden="true" />
              <span title={rewriteSelection.text}>
                选区 · {summarizeReference(rewriteSelection.text)}
              </span>
              <button
                type="button"
                aria-label="取消选中文字改写"
                disabled={busy}
                onClick={onClearRewrite}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </span>
          )}

          {selectedReferences.map((reference) => {
            const summary = summarizeReference(reference.text);
            return (
              <span className="text-reference-chip" key={reference.id}>
                <span title={reference.text}>@ {summary}</span>
                <button
                  type="button"
                  aria-label={`移除引用：${summary}`}
                  disabled={busy}
                  onClick={() => toggleReference(reference.id)}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </span>
            );
          })}
        </div>

        {referenceMenuOpen && (
          <div className="text-reference-menu" aria-label="引用画布文字">
            <div className="text-reference-menu-header">
              <div>
                <strong>引用画布文字</strong>
                <span>生成时作为剧本参考</span>
              </div>
              <span>
                {selectedReferences.length}/{MAX_REFERENCES}
              </span>
            </div>

            <div className="text-reference-menu-list">
              {referenceOptions.length ? (
                referenceOptions.map((reference) => {
                  const selected = selectedReferenceIds.includes(reference.id);
                  const maxReached =
                    !selected && selectedReferenceIds.length >= MAX_REFERENCES;
                  const summary = summarizeReference(reference.text);

                  return (
                    <button
                      className={`text-reference-option ${
                        selected ? "is-selected" : ""
                      }`}
                      type="button"
                      key={reference.id}
                      aria-label={`引用文字：${summary}`}
                      aria-pressed={selected}
                      disabled={busy || maxReached}
                      onClick={() => toggleReference(reference.id)}
                    >
                      <span className="text-reference-option-icon">
                        <FileText size={14} strokeWidth={1.75} />
                      </span>
                      <span>
                        <strong>{summary || "空白文字卡片"}</strong>
                        <small>{reference.text.trim().length} 字</small>
                      </span>
                      <span className="text-reference-option-check">
                        {selected && <Check size={14} strokeWidth={2.2} />}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-reference-empty">
                  画布上暂无其他有内容的文字卡片
                </div>
              )}
            </div>

            <button
              className="text-reference-done"
              type="button"
              onClick={() => setReferenceMenuOpen(false)}
            >
              完成
            </button>
          </div>
        )}
      </div>

      <textarea
        ref={promptRef}
        value={prompt}
        aria-label="AI 写作要求"
        placeholder={
          rewriteSelection
            ? "告诉 AI 怎样改写这段文字……"
            : "描述任何你想要生成的内容，按 @ 引用画布文字……"
        }
        disabled={busy}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <footer className="text-writer-footer">
        <div className="text-writer-model">
          <FileText size={14} strokeWidth={1.8} />
          <ChoicePopover
            aria-label="文字生成模型"
            value={modelName}
            disabled={busy}
            onChange={(event) => onModelChange(event.target.value)}
          >
            <option value="" disabled>请选择模型</option>
            {(modelOptions.length ? modelOptions : [modelName]).map((model) => (
              <option key={model} value={model}>
                {modelLabel(model)}
              </option>
            ))}
          </ChoicePopover>
          <span>
            {rewriteSelection ? "替换选中内容" : "生成到当前卡片"}
          </span>
        </div>

        <div className="text-writer-actions">
          {canUndo && (
            <button
              className="text-writer-undo"
              type="button"
              onClick={onUndo}
            >
              <RotateCcw size={13} strokeWidth={1.8} />
              {undoLabel}
            </button>
          )}
          <span className="text-writer-shortcut">⌘ Enter</span>
          <button
            className="text-writer-submit"
            type="submit"
            aria-label={
              rewriteSelection ? "改写选中文字" : "生成文字卡片内容"
            }
            title={rewriteSelection ? "改写选中文字" : "生成文字卡片内容"}
            disabled={!prompt.trim() || busy}
          >
            {busy ? (
              <LoaderCircle className="agent-spinner" size={17} strokeWidth={2} />
            ) : (
              <ArrowUp size={17} strokeWidth={2} />
            )}
          </button>
        </div>
      </footer>
    </form>
  );
}
