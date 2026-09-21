import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { Unlink } from "lucide-react";
import { useContext } from "react";
import { CanvasActionsContext } from "./CanvasCard";

export function ReferenceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
}: EdgeProps) {
  const actions = useContext(CanvasActionsContext);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} />
      {selected && actions ? (
        <EdgeLabelRenderer>
          <button
            className="reference-edge-remove nodrag nopan"
            type="button"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            aria-label="断开参考"
            title="断开参考"
            onClick={(event) => {
              event.stopPropagation();
              actions.removeReference(id);
            }}
          >
            <Unlink size={13} strokeWidth={1.9} />
            断开
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
