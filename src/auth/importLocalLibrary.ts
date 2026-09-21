import { LIBRARY_KEY, type ProjectLibrary } from '../projects/projectStore';
// Copy local records without deleting originals. Retry is safe: IDs and import marker remain stable.
export async function importLocalLibrary(userId: string) {
  const marker = `mjh.account.${userId}.local-imported`;
  if (localStorage.getItem(marker)) throw new Error('本机内容已导入');
  const raw = localStorage.getItem(LIBRARY_KEY);
  if (!raw) throw new Error('没有可导入的本机项目');
  const source = JSON.parse(raw) as ProjectLibrary;
  if (source.version !== 1 || !Array.isArray(source.projects)) throw new Error('本机项目格式无法读取');
  const targetKey = `mjh.account.${userId}.${LIBRARY_KEY}`;
  const target:ProjectLibrary = JSON.parse(localStorage.getItem(targetKey)||'{"version":1,"projects":[]}');
  const open = (name:string) => new Promise<IDBDatabase>((resolve,reject)=>{
    const req=indexedDB.open(name);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  // Account storage has already been initialized by the project/asset view.
  const destination = await new Promise<IDBDatabase>((resolve,reject)=>{
    const req=indexedDB.open(`manjinhai-canvas-media-${userId}`,2);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('media'))db.createObjectStore('media',{keyPath:'id'});
      if(!db.objectStoreNames.contains('projectAssets')){const s=db.createObjectStore('projectAssets',{keyPath:['projectId','assetId']});s.createIndex('projectId','projectId');s.createIndex('assetId','assetId');}
      if(!db.objectStoreNames.contains('globalAssets'))db.createObjectStore('globalAssets',{keyPath:'assetId'});
    };
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('请关闭其他画布标签页后重试'));
  });
  try {
    for(const dbName of ['manlinghai-canvas-media','manjinhai-canvas-media']) {
      const db=await open(dbName);
      try {
        for(const name of ['media','projectAssets','globalAssets']) {
          if(!db.objectStoreNames.contains(name))continue;
          const records=await new Promise<unknown[]>((resolve,reject)=>{const req=db.transaction(name).objectStore(name).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
          await new Promise<void>((resolve,reject)=>{const tx=destination.transaction(name,'readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);for(const record of records)tx.objectStore(name).put(record);});
        }
      } finally {db.close();}
    }
    const ids=new Set(target.projects.map(p=>p.id));
    localStorage.setItem(targetKey,JSON.stringify({...target,projects:[...target.projects,...source.projects.filter(p=>!ids.has(p.id))]}));
    localStorage.setItem(marker,'1');
  } finally {destination.close();}
}
