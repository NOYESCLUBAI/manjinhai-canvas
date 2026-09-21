import { setAccountScope } from '../src/auth/accountStorage';
import { saveMedia, readMedia, listProjectAssets, addGlobalAsset, listGlobalAssets } from '../src/lib/mediaStore';
if(location.hostname!=='localhost')throw new Error('仅用于 localhost 测试');
document.getElementById('run')!.onclick=async()=>{
 const output=document.getElementById('result')!;
 try {
 const tag=crypto.randomUUID();
 setAccountScope('test-a-'+tag);
 const id=await saveMedia(new File(['test'], 'isolation-test.png',{type:'image/png'}),'test-project');
 const assets=await listProjectAssets('test-project');
 if(assets.length!==1)throw new Error('A 历史资产缺失');
 await addGlobalAsset(assets[0]);
 setAccountScope('test-b-'+tag);
 if(await readMedia(id))throw new Error('B 读取了 A 的素材');
 if((await listProjectAssets('test-project')).length)throw new Error('历史资产泄漏');
 if((await listGlobalAssets()).length)throw new Error('全局资产泄漏');
 setAccountScope('test-a-'+tag);
 if(!(await readMedia(id))||(await listGlobalAssets()).length!==1)throw new Error('A 资产丢失');
 output.textContent='PASS：账号 A/B 的媒体、项目资产、全局资产隔离；切回 A 后内容保留。';
 }catch(e){output.textContent='FAIL: '+String(e);}finally{setAccountScope(null);}
};
