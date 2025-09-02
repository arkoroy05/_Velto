import { ContextNode, GraphEdge, GraphNode, ContextGraph } from '../types'

// Simple cosine similarity
function cosine(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    const va = a[i] || 0
    const vb = b[i] || 0
    dot += va * vb
    na += va * va
    nb += vb * vb
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function keywordJaccard(a: string[], b: string[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0
  const sa = new Set(a)
  const sb = new Set(b)
  const inter = [...sa].filter(x => sb.has(x)).length
  const uni = new Set([...a, ...b]).size
  return uni === 0 ? 0 : inter / uni
}

export interface SimilarityGroup {
  centroidIndex: number
  indices: number[]
}

export class EfficientGraphBuilder {
  async buildGraph(nodes: ContextNode[]): Promise<{ graphNodes: GraphNode[]; graphEdges: GraphEdge[] }> {
    const graphNodes: GraphNode[] = nodes.map((n, i) => ({
      id: n.id,
      contextId: (n as any).parentNodeId || (n as any)._id || undefined,
      type: 'conversation' as any,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 80 },
      label: n.summary || n.id
    }))

    const groups = this.groupBySimilarity(nodes)
    const intraEdges = this.buildRelationshipsWithinGroups(nodes, groups)
    const interEdges = this.connectGroups(nodes, groups)

    return { graphNodes, graphEdges: [...intraEdges, ...interEdges] }
  }

  groupBySimilarity(nodes: ContextNode[]): SimilarityGroup[] {
    // O(n log n) via sorting by a cheap signature (e.g., first keyword) to bucket before pairwise
    const keyed = nodes.map((n, i) => ({
      i,
      k: (n.keywords && n.keywords.length > 0) ? n.keywords[0] : n.metadata.chunkType
    }))
    keyed.sort((a, b) => (a.k || '').localeCompare(b.k || ''))

    const groups: SimilarityGroup[] = []
    let start = 0
    while (start < keyed.length) {
      const key = keyed[start].k
      let end = start
      while (end < keyed.length && keyed[end].k === key) end++
      const indices = keyed.slice(start, end).map(x => x.i)
      groups.push({ centroidIndex: indices[0], indices })
      start = end
    }
    return groups
  }

  buildRelationshipsWithinGroups(nodes: ContextNode[], groups: SimilarityGroup[]): GraphEdge[] {
    const edges: GraphEdge[] = []
    for (const g of groups) {
      const base = g.centroidIndex
      for (const idx of g.indices) {
        if (idx === base) continue
        const w = this.computeSimilarity(nodes[base], nodes[idx])
        if (w > 0.2) {
          edges.push({
            id: `${nodes[base].id}-${nodes[idx].id}`,
            source: nodes[base].id,
            target: nodes[idx].id,
            type: w > 0.7 ? 'similar' : 'related',
            weight: w,
            label: `${Math.round(w * 100)}%`
          })
        }
      }
    }
    return edges
  }

  connectGroups(nodes: ContextNode[], groups: SimilarityGroup[]): GraphEdge[] {
    const edges: GraphEdge[] = []
    if (groups.length <= 1) return edges
    // Connect group centroids in a lightweight chain based on similarity
    const centroids = groups.map(g => g.centroidIndex)
    centroids.sort((a, b) => a - b)
    for (let i = 0; i < centroids.length - 1; i++) {
      const a = centroids[i]
      const b = centroids[i + 1]
      const w = this.computeSimilarity(nodes[a], nodes[b])
      if (w > 0.1) {
        edges.push({
          id: `${nodes[a].id}-${nodes[b].id}`,
          source: nodes[a].id,
          target: nodes[b].id,
          type: 'related',
          weight: w,
          label: `${Math.round(w * 100)}%`
        })
      }
    }
    return edges
  }

  private computeSimilarity(a: ContextNode, b: ContextNode): number {
    const embScore = (a.embeddings && b.embeddings && a.embeddings.length === b.embeddings.length && a.embeddings.length > 0)
      ? cosine(a.embeddings, b.embeddings)
      : 0
    const keyScore = keywordJaccard(a.keywords || [], b.keywords || [])
    const lenPenalty = 1 - Math.min(1, Math.abs((a.tokenCount || 0) - (b.tokenCount || 0)) / 8000)
    // Weighted combo with slight penalty/bonus for similar sizes
    return Math.max(0, Math.min(1, embScore * 0.6 + keyScore * 0.3 + lenPenalty * 0.1))
  }
}

export default EfficientGraphBuilder


