import type { CanvasNode, CanvasEdge, CardKind } from "../types";
import type { CanvasAgentPlan } from "./canvasAgent";
const sizes: Record<CardKind, {width:number;height:number}> = {text:{width:290,height:190},image:{width:310,height:250},video:{width:350,height:250}};
export function canvasFingerprint(nodes: CanvasNode[], edges: CanvasEdge[]) {
  return JSON.stringify({nodes:nodes.map(n=>({id:n.id,data:n.data,position:n.position,style:n.style})),edges:edges.map(e=>({id:e.id,source:e.source,target:e.target}))});
}
export function applyCanvasPlan(plan: CanvasAgentPlan, nodes: CanvasNode[], edges: CanvasEdge[], center: {x:number;y:number}, createId:()=>string) {
  let next = nodes.map(n=>({...n,data:{...n.data},position:{...n.position},style:{...n.style},selected:false}));
  let nextEdges = edges.map(e=>({...e}));
  let row = nodes.length ? Math.max(...nodes.map(n=>n.position.y + (Number(n.style?.height) || sizes[n.data.kind].height))) + 64 : center.y - 100;
  for (const action of plan.actions) {
    if (action.tool === "create_cards") {
      const size = sizes[action.cardType];
      const columns = Math.min(3,action.count);
      const sources = action.referenceIds || [];
      for (let index=0; index<action.count; index++) {
        const id = createId();
        next.push({id,type:"canvas-card",position:{x:center.x-columns*(size.width+32)/2+(index%columns)*(size.width+32),y:row+Math.floor(index/columns)*(size.height+56)},style:{...size},data:{kind:action.cardType,text:action.cardType === "text" ? action.texts?.[index] || "" : undefined},selected:true});
        for (const source of sources) if (next.some(n=>n.id===source)) nextEdges.push({id:`reference:${source}->${id}`,source,target:id,type:"reference",data:{relation:"reference"}});
      }
      row += Math.ceil(action.count/columns)*(size.height+56);
      continue;
    }
    const ids = new Set(action.cardIds);
    if (action.tool === "update_cards") next = next.map(n=>ids.has(n.id) && n.data.kind === "text" ? {...n,data:{...n.data,text:action.text},selected:true}:n);
    if (action.tool === "delete_cards") {
      next = next.filter(n=>!ids.has(n.id));
      nextEdges = nextEdges.filter(e=>!ids.has(e.source) && !ids.has(e.target));
    }
    if (action.tool === "duplicate_cards") {
      const copies = next.filter(n=>ids.has(n.id)).map(n=>({...n,id:createId(),data:{...n.data},style:{...n.style},position:{x:n.position.x+40,y:n.position.y+40},selected:true}));
      next.push(...copies);
    }
    if (action.tool === "arrange_cards") {
      const targets = next.filter(n=>ids.has(n.id));
      if (!targets.length) continue;
      const x = Math.min(...targets.map(n=>n.position.x)), y = Math.min(...targets.map(n=>n.position.y));
      const width = Math.max(...targets.map(n=>Number(n.style?.width)||sizes[n.data.kind].width))+48;
      const height = Math.max(...targets.map(n=>Number(n.style?.height)||sizes[n.data.kind].height))+56;
      const columns = action.direction === "horizontal" ? targets.length : action.direction === "vertical" ? 1 : Math.ceil(Math.sqrt(targets.length));
      const positions = new Map(targets.map((n,i)=>[n.id,{x:x+(i%columns)*width,y:y+Math.floor(i/columns)*height}]));
      next = next.map(n=>positions.has(n.id)?{...n,position:positions.get(n.id)!,selected:true}:n);
    }
  }
  return {nodes:next,edges:nextEdges};
}
