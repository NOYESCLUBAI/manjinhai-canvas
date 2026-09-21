import { saveMedia, readMedia, deleteMedia, listProjectAssets, registerProjectAsset, listGlobalAssetIds, addGlobalAsset } from '../src/lib/mediaStore';
if (location.hostname !== 'localhost') throw new Error('请在 localhost 隔离测试域运行');
const output = document.querySelector('pre')!;
const project = `test-${crypto.randomUUID()}`;
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); output.textContent += `✓ ${message}\n`; };
try {
 const id = await saveMedia(new File(['image'], 'test.png', {type:'image/png'}), project);
 const items = await listProjectAssets(project);
 check(items.length === 1 && items[0].assetId === id, '上传自动进入项目历史');
 check(!(await listGlobalAssetIds()).includes(id), '项目资产不会自动进入全局库');
 check((await listProjectAssets(project+'other')).length === 0, '项目之间的历史隔离');
 await deleteMedia(id);
 check(!!await readMedia(id), '删除画布媒体时保留历史文件');
 await registerProjectAsset({...items[0],createdAt:'2000-01-01'});
 check((await listProjectAssets(project))[0].createdAt === items[0].createdAt, '重复回填不会改变原始时间或重复收录');
 await Promise.all([addGlobalAsset(items[0]),addGlobalAsset(items[0])]);
 check((await listGlobalAssetIds()).filter(key => key === id).length === 1, '并发手动保存全局资产去重');
 await deleteMedia(id);
 check((await readMedia(id))?.fileName === 'test.png', '全局收藏的文件不会被撤销清除');
 const video = await saveMedia(new File(['video'], 'test.mp4',{type:'video/mp4'}),project);
 check((await listProjectAssets(project)).find(a => a.assetId === video)?.kind === 'video', '视频分类正确');
 const loose = await saveMedia(new File(['unused'], 'unused.png'));
 await deleteMedia(loose);
 check(!await readMedia(loose), '未入历史的临时文件仍可清理');
 output.textContent += '全部 9 项资产存储检查通过';
} catch (error) { output.textContent += `FAILED ${String(error)}`; }
const { newProject, readLibrary, writeLibrary } = await import('../src/projects/projectStore');
const fixture = document.createElement('button'); fixture.textContent = '创建界面测试项目'; document.body.append(fixture);
fixture.onclick = async () => {
 const entry = newProject('资产交互验证');
 const blob = await (await fetch('data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#eee"/><circle cx="200" cy="150" r="70" fill="#333"/></svg>'))).blob();
 for (let i=0;i<2;i++) {
   const assetId = await saveMedia(new File([blob], `验证图片${i+1}.svg`, {type:'image/svg+xml'}), entry.id);
   entry.project.canvases[0].nodes.push({id:crypto.randomUUID(),type:'canvas-card',position:{x:350+i*430,y:150},style:{width:380,height:330},data:{kind:'image',assetId,fileName:`验证图片${i+1}.svg`}});
 }
 const library = readLibrary(localStorage, () => newProject('空白测试项目').project); library.projects.push(entry); writeLibrary(localStorage, library);
 const link = document.createElement('a'); link.href = `/#/project/${entry.id}`; link.textContent = '打开资产交互验证'; document.body.append(link); fixture.disabled = true;
};
