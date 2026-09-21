import { setAccountScope } from '../src/auth/accountStorage';
import { createProjectBackup, importProject } from '../src/projects/projectBackup';
import { newProject, type ProjectEntry } from '../src/projects/projectStore';
import { saveMedia, readMedia, listProjectAssets } from '../src/lib/mediaStore';
const button=document.querySelector('button')!;
button.onclick=async()=>{
 button.disabled=true;
 try {
  setAccountScope(`backup-test-${crypto.randomUUID()}`);
  const file=new File([new Uint8Array([1,2,3,4])],'fixture.png',{type:'image/png'});
  const original=newProject('备份回环');
  const id=await saveMedia(file,original.id);
  original.coverAssetId=id;
  original.project.canvases[0].nodes=[{id:'text',type:'canvas-card',position:{x:0,y:0},data:{kind:'text',text:'保留剧本'}},{id:'image',type:'canvas-card',position:{x:300,y:0},data:{kind:'image',assetId:id}}];
  original.project.canvases[0].edges=[{id:'edge',source:'text',target:'image'}];
  const blob=await createProjectBackup(original);
  let imported:ProjectEntry|undefined;
  await importProject(new File([blob],'backup.mjh.json'),entry=>{imported=entry;});
  if(!imported || imported.id===original.id || imported.coverAssetId===id) throw Error('副本标识未隔离');
  const restored=await readMedia(imported.coverAssetId!);
  if(!restored || String(new Uint8Array(await restored.blob.arrayBuffer()))!=='1,2,3,4') throw Error('媒体字节不一致');
  if(imported.project.canvases[0].nodes[0].data.text!=='保留剧本' || imported.project.canvases[0].edges?.length!==1) throw Error('画布丢失');
  if((await listProjectAssets(imported.id)).length!==1 || !(await readMedia(id))) throw Error('历史资产或原件丢失');
  let committed=false;
  try {await importProject(new File(['{}'],'bad.json'),()=>{committed=true;});throw Error('未拒绝无效文件');} catch(e){if(committed || (e as Error).message==='未拒绝无效文件') throw e;}
  document.querySelector('output')!.textContent='通过：真实 IndexedDB 媒体导出/导入、字节一致、画布连线、独立副本、原件保留、历史资产、无效备份拒绝。';
 } catch(e){document.querySelector('output')!.textContent=`失败：${e}`;}
 finally{setAccountScope(null);button.disabled=false;}
};
