import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, FolderPlus, History, X, Play, Image as ImageIcon } from 'lucide-react';
import { ASSETS_CHANGED, addGlobalAsset, listGlobalAssetIds, listProjectAssets, readMedia, registerProjectAsset, type ProjectAsset } from '../lib/mediaStore';
import type { SavedProject } from '../types';
import './assets.css';
import { AssetQuickActions } from './AssetQuickActions';
type AssetContext = { assets: ProjectAsset[]; saved: string[]; error: string; loading: boolean; refresh: () => Promise<void> };
const Context = createContext<AssetContext | null>(null);
function useAssets() { const value = useContext(Context); if (!value) throw new Error('资产上下文不可用'); return value; }
export function ProjectAssetsProvider({ projectId, project, children }: { projectId: string; project: SavedProject; children: ReactNode }) {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const initial = useRef(project);
  async function refresh() {
    try { const [items, ids] = await Promise.all([listProjectAssets(projectId), listGlobalAssetIds()]); setAssets(items); setSaved(ids); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : '资产读取失败'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    const update = () => { if (active) void refresh(); };
    window.addEventListener(ASSETS_CHANGED, update);
    void (async () => {
      try {
        for (const canvas of initial.current.canvases) for (const node of canvas.nodes) {
          const data = node.data;
          if (data.assetId && (data.kind === 'image' || data.kind === 'video')) await registerProjectAsset({ projectId, assetId: data.assetId, kind: data.kind, fileName: data.fileName || '未命名素材', createdAt: data.imageGeneration?.generatedAt || data.videoGeneration?.generatedAt || canvas.createdAt });
        }
        update();
      } catch (e) { if (active) { setError(e instanceof Error ? e.message : '历史资产读取失败'); setLoading(false); } }
    })();
    return () => { active = false; window.removeEventListener(ASSETS_CHANGED, update); };
  }, [projectId]);
  return <Context.Provider value={{ assets, saved, error, loading, refresh }}>{children}</Context.Provider>;
}
export function SaveGlobalButton({ assetId, compact = false }: { assetId: string; compact?: boolean }) {
  const { assets, saved, refresh } = useAssets();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const done = saved.includes(assetId);
  async function save() {
    setBusy(true); setError('');
    try { const asset = assets.find(item => item.assetId === assetId); if (!asset) throw new Error('素材正在入库，请稍后重试。'); await addGlobalAsset(asset); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : '保存失败，请重试'); }
    finally { setBusy(false); }
  }
  return <span className="asset-save-control nodrag"><button type="button" title={done ? '已添加到全局资产' : '添加到全局资产'} disabled={busy || done} onClick={() => void save()}>{done ? <Check size={15}/> : <FolderPlus size={15}/>}<span>{busy ? '保存中…' : done ? (compact ? '已添加' : '已添加到全局资产') : '添加到全局资产'}</span></button>{error && <small role="alert">{error}</small>}</span>;
}
export function AssetMedia({ asset, preview = false }: { asset: ProjectAsset; preview?: boolean }) {
  const [url, setUrl] = useState(''); const [error, setError] = useState(false);
  useEffect(() => {
    let active = true; let objectUrl = ''; setUrl(''); setError(false);
    void readMedia(asset.assetId).then(media => { if (!active) return; if (!media) { setError(true); return; } objectUrl = URL.createObjectURL(media.blob); setUrl(objectUrl); }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [asset.assetId]);
  if (error) return <span>素材文件不可用</span>;
  if (!url) return <span>加载中…</span>;
  return asset.kind === 'image' ? <img src={url} alt={asset.fileName} onError={() => setError(true)}/> : <video src={url} controls={preview} muted={!preview} preload="metadata" onError={() => setError(true)}/>;
}
function day(date: string) { const d = new Date(date); return Number.isNaN(d.getTime()) ? '较早的素材' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function ProjectAssetsButton({ onUse }: { onUse: (asset: ProjectAsset) => Promise<void> }) {
  const { assets, saved, loading, error, refresh } = useAssets();
  const [open, setOpen] = useState(false); const [kind, setKind] = useState<'image'|'video'>('image'); const [selected, setSelected] = useState<ProjectAsset | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);
  useEffect(() => { if (!open) return; const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !dialog.current?.open) setOpen(false); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [open]);
  async function useAsset(asset: ProjectAsset) { await onUse(asset); setSelected(null); setOpen(false); }
  const filtered = assets.filter(asset => asset.kind === kind);
  const dates = [...new Set(filtered.map(asset => day(asset.createdAt)))];
  return <>
    <button type="button" title="项目资产" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) void refresh(); }}><History size={19}/></button>
    {open && createPortal(<aside className="project-assets-panel" aria-label="项目资产" onWheel={event => event.stopPropagation()}>
      <header><div><h2>项目资产</h2><p>当前项目的历史素材</p></div><button type="button" title="关闭项目资产" onClick={() => setOpen(false)}><X size={19}/></button></header>
      <div className="asset-tabs" role="tablist" aria-label="资产类型">{(['image','video'] as const).map(type => <button type="button" role="tab" aria-selected={kind === type} key={type} onClick={() => { setKind(type); }}>{type === 'image' ? '图片' : '视频'} <small>{assets.filter(a => a.kind === type).length}</small></button>)}</div>
      <div className="asset-history">
        {error ? <div role="alert">{error}<button type="button" onClick={() => void refresh()}>重试</button></div> : loading ? <p className="asset-empty">正在读取资产…</p> : filtered.length === 0 ? <div className="asset-empty"><ImageIcon size={30}/><strong>还没有{kind === 'image' ? '图片' : '视频'}资产</strong><p>上传或生成后，会自动保存在这里</p></div> : dates.map(date => <section key={date}><h3>{date}</h3><div className="asset-grid">{filtered.filter(a => day(a.createdAt) === date).map(asset => <div className="asset-tile" key={asset.assetId}><button className="asset-thumb-button" type="button" title={asset.fileName} aria-label={`预览 ${asset.fileName}`} onClick={() => setSelected(asset)}><AssetMedia asset={asset}/>{asset.kind === 'video' && <Play className="asset-play" size={22}/>} {saved.includes(asset.assetId) && <span className="asset-saved"><Check size={12}/>已添加</span>}</button><AssetQuickActions asset={asset} onPreview={() => setSelected(asset)} onUse={() => useAsset(asset)}/></div>)}</div></section>)}
      </div><footer>仅手动添加的素材会进入全局资产库</footer>
    </aside>, document.body)}
    {createPortal(<dialog ref={dialog} className="asset-preview-dialog" onCancel={() => setSelected(null)} onClose={() => setSelected(null)}>
      {selected && <><header><div><h2>资产预览</h2><p>{selected.fileName}</p></div><button type="button" title="关闭资产预览" onClick={() => setSelected(null)}><X size={20}/></button></header><div className="asset-large-media"><AssetMedia asset={selected} preview/></div><footer><span>{day(selected.createdAt)} · {selected.kind === 'image' ? '图片' : '视频'}</span><SaveGlobalButton assetId={selected.assetId}/></footer></>}
    </dialog>, document.body)}
  </>;
}
