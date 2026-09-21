import { useEffect, useRef, useState } from 'react';
import { Download, Library, Play, Search, X } from 'lucide-react';
import { ASSETS_CHANGED, listGlobalAssets, readMedia, type GlobalAsset } from '../lib/mediaStore';
import type { ProjectLibrary } from '../projects/projectStore';
import { AssetMedia } from './ProjectAssets';
import './assets.css';
import { AssetQuickActions } from './AssetQuickActions';

export function GlobalAssets({ library, onOpenProject }: { library: ProjectLibrary; onOpenProject: (id: string) => void }) {
  const [assets, setAssets] = useState<GlobalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState<GlobalAsset | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const [revision, setRevision] = useState(0);
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const items = await listGlobalAssets(); if (active) { setAssets(items); setError(''); } }
      catch (e) { if (active) setError(e instanceof Error ? e.message : '资产读取失败，请重试'); }
      finally { if (active) setLoading(false); }
    };
    void load(); window.addEventListener(ASSETS_CHANGED, load); window.addEventListener('focus', load);
    return () => { active = false; window.removeEventListener(ASSETS_CHANGED, load); window.removeEventListener('focus', load); };
  }, [revision]);
  useEffect(() => { setDownloadError(''); if (selected) modal.current?.showModal(); else modal.current?.close(); }, [selected]);
  const projectName = (asset: GlobalAsset) => library.projects.find(p => p.id === asset.projectId)?.project.projectTitle || '原项目';
  const visible = assets.filter(asset => (kind === 'all' || kind === asset.kind) && `${asset.fileName} ${projectName(asset)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b) => sort === 'name' ? a.fileName.localeCompare(b.fileName, 'zh-CN') : b.savedAt.localeCompare(a.savedAt));
  const source = selected && library.projects.find(p => p.id === selected.projectId && !p.trashedAt);
  async function download(asset: GlobalAsset) {
    try {
      const media = await readMedia(asset.assetId); if (!media) throw new Error('素材文件不可用');
      const url = URL.createObjectURL(media.blob); const a = document.createElement('a'); a.href = url; a.download = asset.fileName; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setDownloadError(e instanceof Error ? e.message : '下载失败，请重试'); }
  }
  return <>
    <header className="home-heading"><div><h1>全局资产</h1><p>把值得留用的画面，收在一起。</p></div><span className="global-asset-count">{assets.length} 个资产</span></header>
    <div className="home-toolbar"><label className="home-search"><Search size={18}/><input aria-label="搜索全局资产" placeholder="搜索素材名称、来源项目" value={query} onChange={e => {setQuery(e.target.value);}}/>{query && <button aria-label="清除资产搜索" onClick={() => setQuery('')}><X size={15}/></button>}</label><select aria-label="资产排序" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">最近添加</option><option value="name">素材名称</option></select></div>
    <div className="global-asset-tabs" role="tablist" aria-label="全局资产类型">{[{id:'all',name:'全部'}, {id:'image',name:'图片'}, {id:'video',name:'视频'}].map(tab => <button key={tab.id} role="tab" aria-selected={kind === tab.id} onClick={() => {setKind(tab.id);}}>{tab.name}<small>{assets.filter(a => tab.id === 'all' || a.kind === tab.id).length}</small></button>)}</div>
    {error ? <div className="home-error" role="alert">{error}<button onClick={() => { setLoading(true); setRevision(r => r+1); }}>重试</button></div> : loading ? <div className="home-empty">正在读取资产…</div> : !visible.length ? <div className="home-empty"><Library size={36} strokeWidth={1.2}/><h2>{query ? '没有找到相关资产' : assets.length ? '这个分类还没有资产' : '还没有全局资产'}</h2><p>{query ? '试试其他素材名称或项目名称。' : '在画布或项目资产预览中，点击「添加到全局资产」，就会出现在这里。'}</p></div> : <div className="global-asset-grid">{visible.map(asset => <article className="global-asset-card" key={asset.assetId}><div className="global-asset-image-wrap"><button aria-label={`预览 ${asset.fileName}`} onClick={() => setSelected(asset)}><div className="global-asset-cover"><AssetMedia asset={asset}/>{asset.kind === 'video' && <Play size={26}/>}</div></button><AssetQuickActions asset={asset} onPreview={() => setSelected(asset)}/></div><button className="global-asset-name" onClick={() => setSelected(asset)}><strong>{asset.fileName}</strong></button><p><span>{projectName(asset)}</span><time>{new Date(asset.savedAt).toLocaleDateString('zh-CN')}</time></p></article>)}</div>}
    <dialog ref={modal} className="asset-preview-dialog" aria-label="全局资产预览" onCancel={() => setSelected(null)} onClose={() => setSelected(null)}>{selected && <><header><div><h2>资产预览</h2><p>{selected.fileName}</p></div><button aria-label="关闭资产预览" onClick={() => setSelected(null)}><X size={20}/></button></header><div className="asset-large-media"><AssetMedia asset={selected} preview/></div><footer><div><span>来源：{projectName(selected)}</span>{downloadError && <p role="alert">{downloadError}</p>}</div><div className="global-preview-actions">{source && <button onClick={() => onOpenProject(source.id)}>打开来源项目</button>}<button onClick={() => void download(selected)}><Download size={16}/>下载{selected.kind === 'image' ? '图片' : '视频'}</button></div></footer></>}</dialog>
  </>;
}
