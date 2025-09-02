import { ContextGraph, ContextNode, GraphNode } from '../types'
import { EfficientGraphBuilder } from './efficient-graph-builder'

export class IncrementalGraphUpdater {
  private builder = new EfficientGraphBuilder()

  async addNode(node: ContextNode, graph: ContextGraph): Promise<ContextGraph> {
    const graphNode: GraphNode = {
      id: node.id,
      contextId: (node as any).parentNodeId || (node as any)._id || undefined,
      type: 'conversation' as any,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 80 },
      label: node.summary || node.id
    }
    const nodes = [...graph.nodes, graphNode]
    const { graphEdges } = await this.builder.buildGraph(nodes as any)
    return { ...graph, nodes, edges: graphEdges, updatedAt: new Date() }
  }

  async removeNode(nodeId: string, graph: ContextGraph): Promise<ContextGraph> {
    const nodes = graph.nodes.filter(n => n.id !== nodeId)
    const edges = graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    return { ...graph, nodes, edges, updatedAt: new Date() }
  }

  async updateNode(node: ContextNode, graph: ContextGraph): Promise<ContextGraph> {
    const nodes = graph.nodes.map(n => n.id === node.id ? {
      ...n,
      label: node.summary || node.id
    } : n)
    const { graphEdges } = await this.builder.buildGraph(nodes as any)
    return { ...graph, nodes, edges: graphEdges, updatedAt: new Date() }
  }
}

export default IncrementalGraphUpdater


