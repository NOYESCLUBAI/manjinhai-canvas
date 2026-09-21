import type { SavedProject } from '../types';

export const LIBRARY_KEY = 'mjh.projects.v1';
export type ProjectEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  favorite: boolean;
  trashedAt?: string;
  coverAssetId?: string;
  project: SavedProject;
};
export type ProjectLibrary = {
  version: 1;
  projects: ProjectEntry[];
  lastOpenedProjectId?: string;
};
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;

export function cleanProject(project: SavedProject): SavedProject {
  return {
    ...project,
    canvases: project.canvases.map(canvas => ({
      ...canvas,
      viewport: { ...canvas.viewport },
      nodes: canvas.nodes.map(node => ({
        ...node, selected: false, dragging: false,
        position: { ...node.position },
        data: { ...node.data, assetUrl: undefined },
      })),
      edges: (canvas.edges || []).map(edge => ({ ...edge, selected: false })),
    })),
  };
}

export function newProject(title: string): ProjectEntry {
  const timestamp = new Date().toISOString();
  const canvasId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp, favorite: false,
    project: {
      version: 2, projectTitle: title.trim() || '未命名项目', activeCanvasId: canvasId,
      canvases: [{ id: canvasId, title: '第 1 集', nodes: [], edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }, createdAt: timestamp, updatedAt: timestamp }],
    },
  };
}

export function writeLibrary(storage: StorageAccess, library: ProjectLibrary) {
  // Only publish the new in-memory state after this write succeeds.
  storage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

export function readLibrary(storage: StorageAccess, legacy: () => SavedProject): ProjectLibrary {
  const raw = storage.getItem(LIBRARY_KEY);
  if (raw !== null) {
    const parsed = JSON.parse(raw) as ProjectLibrary;
    if (parsed.version !== 1 || !Array.isArray(parsed.projects) ||
      parsed.projects.some(entry => !entry.id || !entry.project || !Array.isArray(entry.project.canvases) || !entry.project.canvases.length)) {
      throw new Error('项目列表无法读取，原数据已保留。请勿清除浏览器数据。');
    }
    return parsed;
  }
  const original = cleanProject(legacy());
  const entry = newProject(original.projectTitle);
  entry.project = original;
  const dates = original.canvases.map(canvas => canvas.updatedAt).filter(Boolean).sort();
  entry.updatedAt = dates.at(-1) || entry.updatedAt;
  entry.createdAt = original.canvases.map(canvas => canvas.createdAt).filter(Boolean).sort()[0] || entry.createdAt;
  const library: ProjectLibrary = { version: 1, projects: [entry], lastOpenedProjectId: entry.id };
  // The original mjh.project.v2 record is deliberately left untouched.
  writeLibrary(storage, library);
  return library;
}

export function copyProject(source: ProjectEntry): ProjectEntry {
  const copy = newProject(`${source.project.projectTitle} 副本`);
  const project = structuredClone(cleanProject(source.project));
  const originalActive = project.activeCanvasId;
  for (const canvas of project.canvases) {
    const oldId = canvas.id;
    canvas.id = crypto.randomUUID();
    if (oldId === originalActive) project.activeCanvasId = canvas.id;
    const ids = new Map(canvas.nodes.map(node => [node.id, crypto.randomUUID()]));
    canvas.nodes = canvas.nodes.map(node => ({
      ...node, id: ids.get(node.id)!,
      data: {
        ...node.data,
        imageGeneration: node.data.imageGeneration ? {
          ...node.data.imageGeneration,
          referenceIds: node.data.imageGeneration.referenceIds.flatMap(id => ids.has(id) ? [ids.get(id)!] : []),
        } : undefined,
      },
    }));
    canvas.edges = (canvas.edges || []).flatMap(edge => ids.has(edge.source) && ids.has(edge.target) ? [{
      ...edge, id: crypto.randomUUID(), source: ids.get(edge.source)!, target: ids.get(edge.target)!,
    }] : []);
    canvas.createdAt = copy.createdAt;
    canvas.updatedAt = copy.updatedAt;
  }
  project.projectTitle = copy.project.projectTitle;
  return { ...copy, project, coverAssetId: source.coverAssetId };
}
