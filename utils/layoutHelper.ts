
import { WorkflowNode, RenderedNode, RenderedEdge, LayoutOrientation } from '../types';
import { COLORS, GAP_X, GAP_Y, NODE_WIDTH, NODE_HEIGHT, H_GAP_X, H_GAP_Y, H_NODE_WIDTH, H_NODE_HEIGHT } from '../constants';

/**
 * A heuristic layout engine to mimic Git graphs.
 * It assigns a "Rank" (depth/time) and a "Lane" (parallel branch index).
 */
export const calculateLayout = (
  nodes: WorkflowNode[],
  orientation: LayoutOrientation
): { nodes: RenderedNode[]; edges: RenderedEdge[]; width: number; height: number } => {
  
  // 1. Sort nodes by date as a baseline for processing order
  const sortedNodes = [...nodes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // 2. Calculate Ranks (Topological Depth)
  // Rank 0 = Roots. Rank N = Max(ParentRank) + 1.
  const ranks = new Map<string, number>();
  
  // Initialize roots
  sortedNodes.forEach(node => {
      if (node.parentIds.length === 0) {
          ranks.set(node.id, 0);
      }
  });

  // Iteratively assign ranks to handle dependencies
  // We perform a few passes to ensure all parent ranks are propagated to children
  let changed = true;
  let iterations = 0;
  const maxIterations = nodes.length + 2; // Guard against infinite loops

  while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      sortedNodes.forEach(node => {
          if (node.parentIds.length > 0) {
              let maxParentRank = -1;
              let hasParentRank = false;

              node.parentIds.forEach(pid => {
                  if (ranks.has(pid)) {
                      maxParentRank = Math.max(maxParentRank, ranks.get(pid)!);
                      hasParentRank = true;
                  }
              });

              if (hasParentRank) {
                  const newRank = maxParentRank + 1;
                  // Only update if rank increases (pushing it down)
                  if ((ranks.get(node.id) ?? -1) < newRank) {
                      ranks.set(node.id, newRank);
                      changed = true;
                  }
              }
          }
      });
  }

  // Fallback: If any node didn't get a rank (disconnected cycle?), use index
  sortedNodes.forEach((node, index) => {
      if (!ranks.has(node.id)) {
          ranks.set(node.id, index);
      }
  });

  // 3. Assign Lanes and Coordinates
  // We process nodes sorted first by Rank, then by Date.
  // This ensures we fill the visual grid layer by layer.
  const layoutNodes = [...sortedNodes].sort((a, b) => {
      const rA = ranks.get(a.id) ?? 0;
      const rB = ranks.get(b.id) ?? 0;
      if (rA !== rB) return rA - rB;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const nodeMap = new Map<string, RenderedNode>();
  const laneAllocation: { [key: number]: string | null } = {}; // lane index -> last node id occupying it

  layoutNodes.forEach(node => {
    const rank = ranks.get(node.id)!;
    
    // Determine Lane
    let assignedLane = -1;
    
    // Attempt to inherit lane from first parent (if we are the direct continuation)
    if (node.parentIds.length > 0) {
        const firstParentId = node.parentIds[0];
        const firstParent = nodeMap.get(firstParentId);
        
        // We can inherit if the parent's lane currently points to the parent (it hasn't been taken by a sibling yet)
        if (firstParent && laneAllocation[firstParent.lane] === firstParent.id) {
            assignedLane = firstParent.lane;
        }
    }

    // If we couldn't inherit, find the first empty lane
    if (assignedLane === -1) {
        let l = 0;
        while (true) {
            // Check if lane is completely free or if we want to recycle (recycling is complex, sticking to simple append for clarity)
            // To prevent crossing lines, we generally just take the next unused lane index
            if (laneAllocation[l] === undefined || laneAllocation[l] === null) {
                assignedLane = l;
                break;
            }
            l++;
        }
    }

    // Update lane allocation
    laneAllocation[assignedLane] = node.id;
    
    // Assign Color based on Lane
    let color = COLORS[assignedLane % COLORS.length];
    
    if (node.status === 'abandoned') {
        color = '#64748b'; // Slate 500
    } else if (node.status === 'standby') {
        color = '#f59e0b'; // Amber 500
    }

    // Calculate X, Y
    let x = 0;
    let y = 0;

    if (orientation === 'vertical') {
        // Vertical: Y increases with Rank, X depends on Lane
        x = assignedLane * (NODE_WIDTH + GAP_X) + 50; 
        y = rank * (NODE_HEIGHT + GAP_Y) + 50;
    } else {
        // Horizontal: X increases with Rank, Y depends on Lane
        x = rank * (H_GAP_X) + 50;
        y = assignedLane * (H_NODE_HEIGHT + H_GAP_Y) + 50;
    }

    nodeMap.set(node.id, {
        ...node,
        x,
        y,
        lane: assignedLane,
        color
    });
  });

  const renderedNodes = Array.from(nodeMap.values());
  const renderedEdges: RenderedEdge[] = [];

  renderedNodes.forEach(node => {
      node.parentIds.forEach(parentId => {
          const parent = nodeMap.get(parentId);
          if (parent) {
              let edgeColor = parent.color;
              if (node.status === 'abandoned') edgeColor = '#94a3b8';
              else if (node.status === 'standby') edgeColor = '#fbbf24'; // Amber 400

              renderedEdges.push({
                  id: `${parent.id}-${node.id}`,
                  sourceX: parent.x,
                  sourceY: parent.y,
                  targetX: node.x,
                  targetY: node.y,
                  color: edgeColor,
                  status: node.status
              });
          }
      });
  });

  // Calculate canvas bounds
  const maxX = Math.max(...renderedNodes.map(n => n.x)) + (orientation === 'vertical' ? NODE_WIDTH : H_NODE_WIDTH) + 100;
  const maxY = Math.max(...renderedNodes.map(n => n.y)) + (orientation === 'vertical' ? NODE_HEIGHT : H_NODE_HEIGHT) + 100;

  return {
      nodes: renderedNodes,
      edges: renderedEdges,
      width: Math.max(maxX, window.innerWidth),
      height: Math.max(maxY, window.innerHeight)
  };
};

// Generate SVG Path for Bezier Curve
export const getPath = (
    sx: number, sy: number, 
    tx: number, ty: number, 
    orientation: LayoutOrientation
): string => {
    // Vertical Layout: Connect Bottom of Source to Top of Target
    if (orientation === 'vertical') {
        const startX = sx + NODE_WIDTH / 2;
        const startY = sy + NODE_HEIGHT;
        const endX = tx + NODE_WIDTH / 2;
        const endY = ty;
        
        const distY = endY - startY;
        // Make the curve slightly flatter if the nodes are far apart horizontally
        const controlY1 = startY + distY * 0.5;
        const controlY2 = endY - distY * 0.5;

        return `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;
    } 
    // Horizontal Layout: Connect Right of Source to Left of Target
    else {
        const startX = sx + 200; // H_NODE_WIDTH aprox
        const startY = sy + 30; // approx center Y
        const endX = tx;
        const endY = ty + 30;

        const distX = endX - startX;
        const controlX1 = startX + distX * 0.5;
        const controlX2 = endX - distX * 0.5;

        return `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;
    }
};
