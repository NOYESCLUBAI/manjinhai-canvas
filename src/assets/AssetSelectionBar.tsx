import { useState } from 'react';
import { addGlobalAsset, type ProjectAsset } from '../lib/mediaStore';
import { downloadAsset } from './AssetQuickActions';
export function AssetSelectionBar({ assets, onClear, allowSave = false }: { assets: ProjectAsset[]; onClear: () => void; allowSave?: boolean }) {
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  async function run(save: boolean) {
    setBusy(true); setNotice(''); let done = 0;
    try { for (const asset of assets) { if (save) await addGlobalAsset(asset); else await downloadAsset(asset); done++; } setNotice(save ? `已添加 ${done} 个素材到全局资产` : `已发起 ${done} 个文件下载`); }
    catch (e) { setNotice(`已处理 ${done} 个；${e instanceof Error ? e.message : '操作失败，请重试'}`); }
    finally { setBusy(false); }
  }
  return <div className="asset-selection-bar"><div><strong>已选 {assets.length} 项</strong><button disabled={busy} onClick={onClear}>取消选择</button></div><div><button disabled={busy} onClick={() => void run(false)}>批量下载</button>{allowSave && <button disabled={busy} onClick={() => void run(true)}>添加到全局资产</button>}</div>{notice && <p role="status">{notice}</p>}</div>;
}
export function toggleAsset(ids: string[], id: string) { return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]; }
