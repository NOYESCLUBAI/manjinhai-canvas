import type { CanvasNode, CanvasEdge } from '../types';
export const CANVAS_GRID_SIZE = 16;
export function nodeSize(node: CanvasNode) {
  return { width: node.measured?.width || Number(node.style?.width) || 310, height: node.measured?.height || Number(node.style?.height) || 250 };
}
/** Lay out connected components independently; collapse cycles before assigning columns. */
export function tidyCanvas(nodes: CanvasNode[], edges: CanvasEdge[]): CanvasNode[] {
  if (!nodes.length) return [];
  const byId = new Map(nodes.map(n => [n.id,n]));
  const outgoing = new Map(nodes.map(n => [n.id, [] as string[]]));
  const neighbors = new Map(nodes.map(n => [n.id, [] as string[]]));
  for (const edge of edges) if (byId.has(edge.source) && byId.has(edge.target) && edge.source !== edge.target) {
    outgoing.get(edge.source)!.push(edge.target);
    neighbors.get(edge.source)!.push(edge.target); neighbors.get(edge.target)!.push(edge.source);
  }
  const ordered = [...nodes].sort((a,b) => a.position.y-b.position.y || a.position.x-b.position.x || a.id.localeCompare(b.id));
  const seen = new Set<string>(); const components: string[][] = [];
  for (const node of ordered) if (!seen.has(node.id)) {
    const ids: string[] = []; const pending = [node.id]; seen.add(node.id);
    while (pending.length) { const id = pending.pop()!; ids.push(id); for (const next of neighbors.get(id)!) if (!seen.has(next)) {seen.add(next);pending.push(next);} }
    components.push(ids);
  }
  const positions = new Map<string,{x:number;y:number}>(); let top = 40;
  for (const component of components) {
    let serial = 0; const index = new Map<string,number>(), low = new Map<string,number>();
    const stack: string[] = []; const onStack = new Set<string>(); const groups: string[][] = [];
    function visit(id: string) {
      index.set(id,serial); low.set(id,serial++); stack.push(id); onStack.add(id);
      for (const target of outgoing.get(id)!) {
        if (!index.has(target)) { visit(target); low.set(id,Math.min(low.get(id)!,low.get(target)!)); }
        else if (onStack.has(target)) low.set(id,Math.min(low.get(id)!,index.get(target)!));
      }
      if (low.get(id) === index.get(id)) { const group: string[] = []; let item: string; do { item=stack.pop()!;onStack.delete(item);group.push(item); } while(item !== id); groups.push(group); }
    }
    component.forEach(id => {if (!index.has(id)) visit(id);});
    const groupOf = new Map(groups.flatMap((group,i)=>group.map(id=>[id,i] as const)));
    const rank = groups.map(()=>0), indegree = groups.map(()=>0), next = groups.map(()=>new Set<number>());
    for (const id of component) for (const target of outgoing.get(id)!) {const a=groupOf.get(id)!,b=groupOf.get(target)!; if(a!==b && !next[a].has(b)) {next[a].add(b);indegree[b]++;}}
    const queue = indegree.map((v,i)=>v===0?i:-1).filter(i=>i>=0);
    for(let i=0;i<queue.length;i++) for(const target of next[queue[i]]) {rank[target]=Math.max(rank[target],rank[queue[i]]+1);if(--indegree[target]===0)queue.push(target);}
    const columns: CanvasNode[][] = Array.from({length:Math.max(...rank)+1},()=>[]);
    for(const node of ordered) if(groupOf.has(node.id)) columns[rank[groupOf.get(node.id)!]].push(node);
    const heights = columns.map(column=>column.reduce((h,n)=>h+nodeSize(n).height,0)+Math.max(0,column.length-1)*56);
    const height = Math.max(...heights); let left=40;
    columns.forEach((column,i)=>{let y=top+(height-heights[i])/2; for(const node of column) {positions.set(node.id,{x:left,y});y+=nodeSize(node).height+56;} left+=Math.max(...column.map(n=>nodeSize(n).width))+96;});
    top += height+120;
  }
  return nodes.map(node=>({...node,position:positions.get(node.id)!,selected:false}));
}
