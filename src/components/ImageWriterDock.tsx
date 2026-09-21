import { ChoicePopover } from "./ChoicePopover";
import { modelLabel } from "../lib/modelConfigs";
import {
  Aperture,
  ArrowUp,
  Check,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Cpu,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  IMAGE_ANGLE_OPTIONS,
  IMAGE_ASPECT_OPTIONS,
  IMAGE_LENS_OPTIONS,
  IMAGE_RESOLUTION_OPTIONS,
  IMAGE_SHOT_OPTIONS,
  IMAGE_STYLE_OPTIONS,
  type ImageReferenceOption,
} from "../lib/imageWriter";
import type { ImageGenerationSettings } from "../types";

const MAX_REFERENCES = 5;

type ImageWriterDockProps = {
  prompt: string;
  settings: ImageGenerationSettings;
  modelOptions: string[];
  referenceOptions: ImageReferenceOption[];
  initialReferenceIds: string[];
  busy: boolean;
  optimizing: boolean;
  configured: boolean;
  focusVersion: number;
  feedback?: {
    type: "success" | "error";
    text: string;
  };
  canUndo: boolean;
  onPromptChange: (prompt: string) => void;
  onSettingsChange: (settings: ImageGenerationSettings) => void;
  onOptimize: () => void;
  onReferencesChange: (referenceIds: string[]) => void;
  onSubmit: (referenceIds: string[]) => void;
  onUndo: () => void;
};

function referenceSummary(option: ImageReferenceOption) {
  const value = option.label.trim().replace(/\s+/g, " ");
  return value.length > 28 ? `${value.slice(0, 28)}…` : value;
}

export function ImageWriterDock({
  prompt,
  settings,
  modelOptions,
  referenceOptions,
  initialReferenceIds,
  busy,
  optimizing,
  configured,
  focusVersion,
  feedback,
  canUndo,
  onPromptChange,
  onSettingsChange,
  onOptimize,
  onReferencesChange,
  onSubmit,
  onUndo,
}: ImageWriterDockProps) {
  const [referenceMenuOpen, setReferenceMenuOpen] = useState(false);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>(
    () => initialReferenceIds.slice(0, MAX_REFERENCES),
  );
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const referenceAreaRef = useRef<HTMLDivElement>(null);
  const cameraAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusVersion > 0) {
      promptRef.current?.focus();
    }
  }, [focusVersion]);

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!referenceAreaRef.current?.contains(target)) {
        setReferenceMenuOpen(false);
      }
      if (!cameraAreaRef.current?.contains(target) && !(target instanceof Element && target.closest(".choice-popover"))) {
        setCameraMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, []);

  const selectedReferences = useMemo(() => {
    const selectedIds = new Set(selectedReferenceIds);
    return referenceOptions.filter((option) => selectedIds.has(option.id));
  }, [referenceOptions, selectedReferenceIds]);
  const availableModelOptions = useMemo(
    () => Array.from(new Set([settings.model, ...modelOptions])).filter(Boolean),
    [modelOptions, settings.model],
  );

  useEffect(() => {
    const next = initialReferenceIds.slice(0, MAX_REFERENCES);
    setSelectedReferenceIds((current) =>
      current.length === next.length &&
      current.every((id, index) => id === next[index])
        ? current
        : next,
    );
  }, [initialReferenceIds]);

  const setSetting = <Key extends keyof ImageGenerationSettings>(
    key: Key,
    value: ImageGenerationSettings[Key],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const toggleReference = (id: string) => {
    const next = selectedReferenceIds.includes(id)
      ? selectedReferenceIds.filter((item) => item !== id)
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
    onSubmit(selectedReferenceIds);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit(selectedReferenceIds);
    }
  };

  return (
    <form className="image-writer-dock" onSubmit={submit}>
      <div className="image-writer-context">
        <span className="image-writer-card-icon">
          <ImagePlus size={15} strokeWidth={1.75} />
        </span>
        <span>生成当前图片卡片</span>
        {feedback ? (
          <span className={`image-writer-feedback is-${feedback.type}`}>
            {feedback.text}
          </span>
        ) : !configured ? (
          <span className="image-writer-feedback is-error">
            图片模型尚未配置
          </span>
        ) : null}
      </div>

      <div className="image-writer-reference-area" ref={referenceAreaRef}>
        <div className="image-writer-reference-row">
          <button
            className="image-prompt-optimize"
            type="button"
            title="优化图片提示词"
            aria-label="优化图片提示词"
            disabled={!prompt.trim() || busy || optimizing}
            onClick={onOptimize}
          >
            {optimizing ? (
              <LoaderCircle className="agent-spinner" size={15} strokeWidth={2} />
            ) : (
              <SlidersHorizontal size={15} strokeWidth={1.8} />
            )}
          </button>

          <span className="image-writer-divider" aria-hidden="true" />

          <button
            className={`image-reference-add ${referenceMenuOpen ? "is-open" : ""}`}
            type="button"
            aria-label="引用画布内容"
            aria-expanded={referenceMenuOpen}
            disabled={busy}
            onClick={() => setReferenceMenuOpen((open) => !open)}
          >
            <Plus size={15} strokeWidth={1.9} />
          </button>

          {selectedReferences.map((option) => (
            <span className="image-reference-chip" key={option.id}>
              {option.kind === "image" && option.assetUrl ? (
                <img src={option.assetUrl} alt="" />
              ) : option.kind === "text" ? (
                <FileText size={12} strokeWidth={1.8} />
              ) : (
                <ImageIcon size={12} strokeWidth={1.8} />
              )}
              <span title={option.label}>{referenceSummary(option)}</span>
              <button
                type="button"
                aria-label={`移除引用：${option.label}`}
                onClick={() => toggleReference(option.id)}
              >
                <X size={11} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>

        {referenceMenuOpen ? (
          <div className="image-reference-menu" aria-label="引用画布内容">
            <div className="image-reference-menu-header">
              <div>
                <strong>引用画布内容</strong>
                <span>文字作为剧情约束，图片作为视觉参考</span>
              </div>
              <span>
                {selectedReferences.length}/{MAX_REFERENCES}
              </span>
            </div>

            <div className="image-reference-menu-list">
              {referenceOptions.length ? (
                referenceOptions.map((option) => {
                  const selected = selectedReferenceIds.includes(option.id);
                  const maxReached =
                    !selected && selectedReferenceIds.length >= MAX_REFERENCES;
                  return (
                    <button
                      className={`image-reference-option ${
                        selected ? "is-selected" : ""
                      }`}
                      type="button"
                      key={option.id}
                      disabled={busy || maxReached}
                      aria-pressed={selected}
                      onClick={() => toggleReference(option.id)}
                    >
                      <span className="image-reference-option-preview">
                        {option.kind === "image" && option.assetUrl ? (
                          <img src={option.assetUrl} alt="" />
                        ) : (
                          <FileText size={15} strokeWidth={1.75} />
                        )}
                      </span>
                      <span>
                        <strong>{referenceSummary(option)}</strong>
                        <small>
                          {option.kind === "image" ? "图片参考" : "文字参考"}
                        </small>
                      </span>
                      <span className="image-reference-option-check">
                        {selected ? <Check size={14} strokeWidth={2.2} /> : null}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="image-reference-empty">
                  画布上暂无可引用的文字或图片
                </div>
              )}
            </div>

            <button
              className="image-reference-done"
              type="button"
              onClick={() => setReferenceMenuOpen(false)}
            >
              完成
            </button>
          </div>
        ) : null}
      </div>

      <textarea
        ref={promptRef}
        value={prompt}
        aria-label="图片生成提示词"
        placeholder="描述你想生成的画面，可引用剧本、角色或已有图片……"
        disabled={busy}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <footer className="image-writer-footer">
        <div className="image-writer-controls">
          <div className="image-control image-model-control">
            <Cpu size={14} strokeWidth={1.8} />
            <span className="visually-hidden">图片模型</span>
            <ChoicePopover
              aria-label="图片生成模型"
              value={settings.model}
              disabled={busy}
              onChange={(event) => setSetting("model", event.target.value)}
            >
              <option value="" disabled>请选择模型</option>
              {availableModelOptions.map((model) => (
                  <option key={model} value={model}>
                    {modelLabel(model)}
                  </option>
                ))}
            </ChoicePopover>
          </div>

          <span className="image-control-group">
            <div className="image-control">
              <SlidersHorizontal size={13} strokeWidth={1.8} />
              <span className="visually-hidden">画面比例</span>
              <ChoicePopover
                aria-label="画面比例"
                value={settings.aspectRatio}
                disabled={busy}
                onChange={(event) =>
                  setSetting(
                    "aspectRatio",
                    event.target.value as ImageGenerationSettings["aspectRatio"],
                  )
                }
              >
                {IMAGE_ASPECT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </ChoicePopover>
            </div>
            <span className="image-control-dot">·</span>
            <div className="image-control image-resolution-control">
              <span className="visually-hidden">图片清晰度</span>
              <ChoicePopover
                aria-label="图片清晰度"
                value={settings.resolution}
                disabled={busy}
                onChange={(event) =>
                  setSetting(
                    "resolution",
                    event.target.value as ImageGenerationSettings["resolution"],
                  )
                }
              >
                {IMAGE_RESOLUTION_OPTIONS.map((resolution) => (
                  <option key={resolution} value={resolution}>
                    {resolution}
                  </option>
                ))}
              </ChoicePopover>
            </div>
          </span>

          <div className="image-control">
            <ImageIcon size={14} strokeWidth={1.8} />
            <span className="visually-hidden">图片风格</span>
            <ChoicePopover
              aria-label="图片风格"
              value={settings.style}
              disabled={busy}
              onChange={(event) => setSetting("style", event.target.value)}
            >
              {IMAGE_STYLE_OPTIONS.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </ChoicePopover>
          </div>

          <div className="image-camera-control" ref={cameraAreaRef}>
            <button
              className={cameraMenuOpen ? "is-open" : ""}
              type="button"
              disabled={busy}
              aria-expanded={cameraMenuOpen}
              onClick={() => setCameraMenuOpen((open) => !open)}
            >
              <Aperture size={14} strokeWidth={1.8} />
              摄影机
            </button>
            {cameraMenuOpen ? (
              <div className="image-camera-menu">
                <strong>摄影机控制</strong>
                <div>
                  <span>景别</span>
                  <ChoicePopover
                    aria-label="景别" value={settings.shot}
                    onChange={(event) => setSetting("shot", event.target.value)}
                  >
                    {IMAGE_SHOT_OPTIONS.map((shot) => (
                      <option key={shot} value={shot}>
                        {shot}
                      </option>
                    ))}
                  </ChoicePopover>
                </div>
                <div>
                  <span>视角</span>
                  <ChoicePopover
                    aria-label="视角" value={settings.angle}
                    onChange={(event) => setSetting("angle", event.target.value)}
                  >
                    {IMAGE_ANGLE_OPTIONS.map((angle) => (
                      <option key={angle} value={angle}>
                        {angle}
                      </option>
                    ))}
                  </ChoicePopover>
                </div>
                <div>
                  <span>镜头</span>
                  <ChoicePopover
                    aria-label="镜头" value={settings.lens}
                    onChange={(event) => setSetting("lens", event.target.value)}
                  >
                    {IMAGE_LENS_OPTIONS.map((lens) => (
                      <option key={lens} value={lens}>
                        {lens}
                      </option>
                    ))}
                  </ChoicePopover>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="image-writer-actions">
          {canUndo ? (
            <button
              className="image-writer-undo"
              type="button"
              disabled={busy}
              onClick={onUndo}
            >
              <RotateCcw size={13} strokeWidth={1.8} />
              撤销生成
            </button>
          ) : null}
          <div className="image-count-control">
            <span className="visually-hidden">生成数量</span>
            <ChoicePopover
              aria-label="生成数量"
              value={settings.count}
              disabled={busy}
              onChange={(event) => setSetting("count", Number(event.target.value))}
            >
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </ChoicePopover>
          </div>
          <span className="image-writer-shortcut">⌘ Enter</span>
          <button
            className="image-writer-submit"
            type="submit"
            aria-label="生成图片"
            title="生成图片"
            disabled={!prompt.trim() || busy || !configured}
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
