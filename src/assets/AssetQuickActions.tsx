import { useState } from 'react';
import { Eye, Download, CircleCheck } from 'lucide-react';
import { readMedia, type ProjectAsset } from '../lib/mediaStore';

export async function downloadAsset(asset: ProjectAsset) {
  const media = await readMedia(asset.assetId);
  if (!media) throw new Error('素材文件不可用，请重新上传。');
  const url = URL.createObjectURL(media.blob);
  const link = document.createElement('a');
  link.href = url; link.download = asset.fileName; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function AssetQuickActions({ asset, onPreview, onUse }: { asset: ProjectAsset; onPreview: () => void; onUse?: () => Promise<void> }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true); setError('');
    try { await downloadAsset(asset); }
    catch (e) { setError(e instanceof Error ? e.message : '下载失败，请重试'); }
    finally { setBusy(false); }
  }
  async function useAsset() {
    if (!onUse || busy) return;
    setBusy(true); setError('');
    try { await onUse(); }
    catch (e) { setError(e instanceof Error ? e.message : '添加到画布失败，请重试'); }
    finally { setBusy(false); }
  }
  return <><div className="asset-quick-actions" aria-label={`${asset.fileName} 快捷操作`}>
    <button type="button" title={asset.kind === 'image' ? '查看大图' : '预览视频'} aria-label={`${asset.kind === 'image' ? '查看大图' : '预览视频'} ${asset.fileName}`} onClick={onPreview}><Eye size={17}/></button>
    {onUse && <button type="button" title="使用" aria-label={`使用 ${asset.fileName}`} disabled={busy} onClick={() => void useAsset()}><CircleCheck size={17}/></button>}
    <button type="button" title="下载" aria-label={`下载 ${asset.fileName}`} disabled={busy} onClick={() => void download()}><Download size={17}/></button>
  </div>{error && <span className="asset-quick-error" role="alert">{error}</span>}</>;
}
