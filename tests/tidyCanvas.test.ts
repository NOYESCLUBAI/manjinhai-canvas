import assert from 'node:assert/strict';
import { tidyCanvas, nodeSize } from '../src/lib/tidyCanvas';
import type { CanvasNode, CanvasEdge } from '../src/types';
const node = (id:string,x:number,y:number,w=280,h=200):CanvasNode => ({id,type:'canvas-card',position:{x,y},style:{width:w,height:h},data:{kind:'text',text:id}});
const edge = (source:string,target:string):CanvasEdge => ({id:source+target,source,target});
const nodes = [node('a',500,600),node('b',20,50,320,700),node('c',200,20),node('d',0,0),node('e',500,0)];
const edges = [edge('a','b'),edge('b','c'),edge('a','c')];
const before=JSON.stringify(nodes); const result=tidyCanvas(nodes,edges); const byId=new Map(result.map(n=>[n.id,n]));
assert.ok(byId.get('a')!.position.x < byId.get('b')!.position.x && byId.get('b')!.position.x < byId.get('c')!.position.x);
assert.equal(JSON.stringify(nodes),before); assert.deepEqual(result.map(n=>n.data),nodes.map(n=>n.data));
for(let i=0;i<result.length;i++) for(let j=i+1;j<result.length;j++) {const a=result[i],b=result[j],as=nodeSize(a),bs=nodeSize(b);assert.ok(a.position.x+as.width<=b.position.x || b.position.x+bs.width<=a.position.x || a.position.y+as.height<=b.position.y || b.position.y+bs.height<=a.position.y);}
assert.deepEqual(tidyCanvas(result,edges),result);
const cycle=tidyCanvas(nodes,[...edges,edge('c','a'),edge('missing','a')]);
assert.equal(cycle.length,nodes.length); assert.ok(cycle.every(n=>Number.isFinite(n.position.x)&&Number.isFinite(n.position.y)));
assert.deepEqual(tidyCanvas([],[]),[]);
console.log('✓ connected layers, variable dimensions, separated components, idempotence, cycles, immutability, empty canvas');
