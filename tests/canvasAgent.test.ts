import assert from 'node:assert/strict';
import { localPlan, sanitizeRemotePlan, planCanvasInstruction } from '../src/agent/canvasAgent';
import { applyCanvasPlan, canvasFingerprint } from '../src/agent/applyCanvasPlan';
import type { CanvasNode, CanvasEdge } from '../src/types';
let passed = 0;
const test = async (name: string, fn: () => unknown) => { await fn(); passed++; console.log(`✓ ${name}`); };
const original = '第一句。第二句。第三句。第四句。第五句。';
const nodes: CanvasNode[] = [{id:'source',type:'canvas-card',position:{x:0,y:0},style:{width:290,height:190},selected:true,data:{kind:'text',text:original}}];
let nextId = 0;
const id = () => `new-${++nextId}`;
await test('local split preserves every sentence and links every new card to source', () => {
  const plan=localPlan('拆分成3个分镜',nodes);
  assert.equal(plan.requiresConfirmation,true);
  const result=applyCanvasPlan(plan,nodes,[],{x:400,y:300},id);
  assert.equal(result.nodes.length,4);
  assert.equal(result.nodes[0].data.text,original);
  assert.equal(result.nodes.slice(1).map(n=>n.data.text?.replace(/^### 分镜 \d+\n\n/, '')).join(''),original);
  assert.equal(result.edges.length,3);
  assert.ok(result.edges.every(e=>e.source==='source'));
  assert.equal(nodes.length,1);
});
await test('delete removes related edges without mutating original snapshot', () => {
  const edges: CanvasEdge[]=[{id:'e',source:'source',target:'image'}];
  const other: CanvasNode={id:'image',type:'canvas-card',position:{x:200,y:0},data:{kind:'image'}};
  const result=applyCanvasPlan(localPlan('删除选中卡片',nodes),[...nodes,other],edges,{x:0,y:0},id);
  assert.deepEqual(result.nodes.map(n=>n.id),['image']);
  assert.equal(result.edges.length,0);
  assert.equal(edges.length,1);
});
await test('remote total creation cap applies across actions', () => {
  assert.throws(()=>sanitizeRemotePlan({actions:[{tool:'create_cards',cardType:'text',count:5},{tool:'create_cards',cardType:'image',count:5}]},nodes));
});
await test('unknown IDs and tools reject the entire plan instead of partly applying', () => {
  assert.throws(()=>sanitizeRemotePlan({actions:[{tool:'delete_cards',cardIds:['missing']}]},nodes));
  assert.throws(()=>sanitizeRemotePlan({actions:[{tool:'create_cards',cardType:'text',count:1},{tool:'publish',cardIds:['source']}]},nodes));
});
await test('read-only remote answers are accepted and never require execution', () => {
  const plan=sanitizeRemotePlan({summary:'当前有一张剧本',actions:[]},nodes);
  assert.equal(plan.actions.length,0);
  assert.equal(plan.requiresConfirmation,false);
});
await test('remote confirmation cannot be disabled by model', () => {
  assert.equal(sanitizeRemotePlan({requiresConfirmation:false,actions:[{tool:'delete_cards',cardIds:['source']}]},nodes).requiresConfirmation,true);
});
await test('fingerprint detects content and position edits but ignores selection', () => {
  assert.equal(canvasFingerprint(nodes,[]),canvasFingerprint(nodes.map(n=>({...n,selected:false})),[]));
  assert.notEqual(canvasFingerprint(nodes,[]),canvasFingerprint(nodes.map(n=>({...n,data:{...n.data,text:'changed'}})),[]));
  assert.notEqual(canvasFingerprint(nodes,[]),canvasFingerprint(nodes.map(n=>({...n,position:{x:100,y:0}})),[]));
});
await test('split without a source does not manufacture story cards', () => assert.equal(localPlan('拆分成3个分镜',nodes.map(n=>({...n,selected:false}))).actions.length,0));
await test('API failure is surfaced and cannot become a fallback mutation', async () => {
  const fetchBefore=globalThis.fetch;
  globalThis.fetch=async ()=>new Response(JSON.stringify({detail:'test model unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});
  try { await assert.rejects(()=>planCanvasInstruction('删除选中卡片',nodes),/test model unavailable/); }
  finally { globalThis.fetch=fetchBefore; }
});
await test('local mode never calls API', async () => {
  const fetchBefore=globalThis.fetch;
  globalThis.fetch=async ()=>{throw new Error('Unexpected API call');};
  try {const result=await planCanvasInstruction('创建1张文字卡片',nodes,{mode:'demo'});assert.equal(result.mode,'demo');assert.equal(result.plan.actions.length,1);}
  finally {globalThis.fetch=fetchBefore;}
});
console.log(`${passed} agent checks passed`);
