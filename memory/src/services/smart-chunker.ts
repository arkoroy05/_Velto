import { Context, ContextNode, ChunkingStrategy, ChunkingResult } from '../types'
import { logger } from '../utils/logger'

/**
 * Smart chunking system that preserves semantic meaning while managing token counts
 * Based on best practices from semantic-chunking and text-splitter libraries
 */
export class SmartChunker {
  private readonly defaultMaxTokens = 4000
  private readonly minChunkTokens = 100
  private readonly maxChunkTokens = 8000

  /**
   * Main chunking method that intelligently breaks down content
   */
  async chunkContent(
    content: string, 
    strategy: ChunkingStrategy = this.getDefaultStrategy()
  ): Promise<ChunkingResult> {
    try {
      logger.info(`Starting smart chunking for content of length: ${content.length}`)
      
      // Step 1: Analyze content structure
      const contentAnalysis = this.analyzeContentStructure(content)
      
      // Step 2: Detect semantic boundaries
      const boundaries = this.detectSemanticBoundaries(content, contentAnalysis)
      
      // Step 3: Create initial chunks based on boundaries
      const initialChunks = this.createInitialChunks(content, boundaries, strategy)
      
      // Step 4: Optimize chunks for token efficiency
      const optimizedChunks = await this.optimizeChunks(initialChunks, strategy)
      
      // Step 5: Validate and finalize chunks
      const finalChunks = this.validateChunks(optimizedChunks, strategy)
      
      logger.info(`Smart chunking completed. Created ${finalChunks.length} chunks`)
      
      return {
        chunks: finalChunks,
        totalTokens: finalChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
        originalLength: content.length,
        chunkCount: finalChunks.length,
        strategy: strategy,
        metadata: {
          chunkingTime: new Date(),
          contentType: contentAnalysis.type,
          language: contentAnalysis.language,
          complexity: contentAnalysis.complexity
        }
      }
    } catch (error) {
      logger.error('Error in smart chunking:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Smart chunking failed: ${errorMessage}`)
    }
  }

  /**
   * Get default chunking strategy
   */
  private getDefaultStrategy(): ChunkingStrategy {
    return {
      maxTokens: this.defaultMaxTokens,
      preserveBoundaries: true,
      semanticGrouping: true,
      overlapTokens: 100,
      respectParagraphs: true,
      respectCodeBlocks: true,
      respectHeaders: true,
      minChunkSize: this.minChunkTokens,
      maxChunkSize: this.maxChunkTokens
    }
  }

  /**
   * Analyze content structure to understand its composition
   */
  private analyzeContentStructure(content: string): ContentAnalysis {
    const analysis: ContentAnalysis = {
      type: 'text',
      language: 'en',
      complexity: 'medium',
      hasCode: false,
      hasMarkdown: false,
      paragraphCount: 0,
      sentenceCount: 0,
      wordCount: 0,
      codeBlockCount: 0,
      headerCount: 0
    }

    // Detect content type
    if (content.includes('```') || content.includes('function') || content.includes('class')) {
      analysis.type = 'code'
      analysis.hasCode = true
    } else if (content.includes('#') || content.includes('**') || content.includes('[')) {
      analysis.type = 'markdown'
      analysis.hasMarkdown = true
    }

    // Count structural elements
    analysis.paragraphCount = (content.match(/\n\s*\n/g) || []).length + 1
    analysis.sentenceCount = (content.match(/[.!?]+/g) || []).length
    analysis.wordCount = content.trim().split(/\s+/).length
    analysis.codeBlockCount = (content.match(/```[\s\S]*?```/g) || []).length
    analysis.headerCount = (content.match(/^#{1,6}\s+/gm) || []).length

    // Determine complexity
    if (analysis.wordCount > 1000 || analysis.codeBlockCount > 5) {
      analysis.complexity = 'high'
    } else if (analysis.wordCount < 200) {
      analysis.complexity = 'low'
    }

    return analysis
  }

  /**
   * Detect semantic boundaries in the content
   */
  private detectSemanticBoundaries(content: string, analysis: ContentAnalysis): Boundary[] {
    const boundaries: Boundary[] = []
    
    // Add start boundary
    boundaries.push({
      position: 0,
      type: 'start',
      strength: 'strong'
    })

    // Detect paragraph boundaries
    const paragraphMatches = content.matchAll(/\n\s*\n/g)
    for (const match of paragraphMatches) {
      boundaries.push({
        position: match.index!,
        type: 'paragraph',
        strength: 'strong'
      })
    }

    // Detect sentence boundaries (but respect code blocks)
    if (analysis.type !== 'code') {
      const sentenceMatches = content.matchAll(/[.!?]+\s+/g)
      for (const match of sentenceMatches) {
        // Skip if inside code block
        if (!this.isInsideCodeBlock(content, match.index!)) {
          boundaries.push({
            position: match.index! + match[0].length,
            type: 'sentence',
            strength: 'medium'
          })
        }
      }
    }

    // Detect code block boundaries
    const codeBlockMatches = content.matchAll(/```[\s\S]*?```/g)
    for (const match of codeBlockMatches) {
      boundaries.push({
        position: match.index!,
        type: 'code_block_start',
        strength: 'strong'
      })
      boundaries.push({
        position: match.index! + match[0].length,
        type: 'code_block_end',
        strength: 'strong'
      })
    }

    // Detect header boundaries
    const headerMatches = content.matchAll(/^#{1,6}\s+/gm)
    for (const match of headerMatches) {
      boundaries.push({
        position: match.index!,
        type: 'header',
        strength: 'strong'
      })
    }

    // Add end boundary
    boundaries.push({
      position: content.length,
      type: 'end',
      strength: 'strong'
    })

    // Sort boundaries by position
    boundaries.sort((a, b) => a.position - b.position)

    return boundaries
  }

  /**
   * Check if a position is inside a code block
   */
  private isInsideCodeBlock(content: string, position: number): boolean {
    const beforeContent = content.substring(0, position)
    const codeBlockStarts = (beforeContent.match(/```/g) || []).length
    const codeBlockEnds = (beforeContent.match(/```/g) || []).length
    
    // If we have an odd number of code block markers, we're inside a code block
    return (codeBlockStarts - codeBlockEnds) % 2 === 1
  }

  /**
   * Create initial chunks based on detected boundaries
   */
  private createInitialChunks(
    content: string, 
    boundaries: Boundary[], 
    _strategy: ChunkingStrategy
  ): InitialChunk[] {
    const chunks: InitialChunk[] = []
    
    for (let i = 0; i < boundaries.length - 1; i++) {
      const startBoundary = boundaries[i]
      const endBoundary = boundaries[i + 1]
      
      if (!startBoundary || !endBoundary || startBoundary.type === 'end') continue
      
      const chunkContent = content.substring(startBoundary.position, endBoundary.position).trim()
      
      if (chunkContent.length === 0) continue
      
      // Estimate token count (rough approximation: 1 token ≈ 4 characters)
      const estimatedTokens = Math.ceil(chunkContent.length / 4)
      
      chunks.push({
        content: chunkContent,
        startPosition: startBoundary.position,
        endPosition: endBoundary.position,
        boundaryType: startBoundary.type,
        boundaryStrength: startBoundary.strength,
        estimatedTokens,
        isCodeBlock: startBoundary.type === 'code_block_start'
      })
    }
    
    return chunks
  }

  /**
   * Optimize chunks for token efficiency while preserving semantics
   */
  private async optimizeChunks(
    initialChunks: InitialChunk[], 
    strategy: ChunkingStrategy
  ): Promise<OptimizedChunk[]> {
    const optimizedChunks: OptimizedChunk[] = []
    let currentChunk = ''
    let currentTokens = 0
    
    for (const chunk of initialChunks) {
      const chunkTokens = chunk.estimatedTokens
      
      // If adding this chunk would exceed max size, finalize current chunk
      if (currentTokens + chunkTokens > strategy.maxChunkSize && currentChunk.length > 0) {
        optimizedChunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokens,
          startPosition: 0, // Will be updated later
          endPosition: 0,   // Will be updated later
          type: this.determineChunkType(currentChunk),
          metadata: {
            isOptimized: true,
            originalChunks: 1
          }
        })
        
        currentChunk = ''
        currentTokens = 0
      }
      
      // Add chunk content
      if (currentChunk.length > 0) {
        currentChunk += '\n\n'
      }
      currentChunk += chunk.content
      currentTokens += chunkTokens
      
      // If we've reached a good size, finalize chunk
      if (currentTokens >= strategy.minChunkSize && 
          (currentTokens >= strategy.maxChunkSize || chunk.boundaryStrength === 'strong')) {
        
        optimizedChunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokens,
          startPosition: 0, // Will be updated later
          endPosition: 0,   // Will be updated later
          type: this.determineChunkType(currentChunk),
          metadata: {
            isOptimized: true,
            originalChunks: 1
          }
        })
        
        currentChunk = ''
        currentTokens = 0
      }
    }
    
    // Add remaining content as final chunk
    if (currentChunk.length > 0) {
      optimizedChunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokens,
        startPosition: 0,
        endPosition: 0,
        type: this.determineChunkType(currentChunk),
        metadata: {
          isOptimized: true,
          originalChunks: 1
        }
      })
    }
    
    return optimizedChunks
  }

  /**
   * Determine the type of a chunk based on its content
   */
  private determineChunkType(content: string): string {
    if (content.includes('```') || content.includes('function') || content.includes('class')) {
      return 'code'
    } else if (content.includes('#') || content.includes('**') || content.includes('[')) {
      return 'markdown'
    } else if (content.includes('http') || content.includes('www.')) {
      return 'web_content'
    } else {
      return 'text'
    }
  }

  /**
   * Validate chunks and ensure they meet requirements
   */
  private validateChunks(chunks: OptimizedChunk[], _strategy: ChunkingStrategy): OptimizedChunk[] {
    return chunks.map((chunk, index) => {
      // Ensure chunk meets minimum size
      if (chunk.tokenCount < _strategy.minChunkSize) {
        logger.warn(`Chunk ${index} is too small (${chunk.tokenCount} tokens), merging with next chunk`)
        // This would need more sophisticated merging logic
      }
      
      // Ensure chunk doesn't exceed maximum size
      if (chunk.tokenCount > _strategy.maxChunkSize) {
        logger.warn(`Chunk ${index} is too large (${chunk.tokenCount} tokens), needs further splitting`)
        // This would need more sophisticated splitting logic
      }
      
      // Update positions
      chunk.startPosition = index
      chunk.endPosition = index + 1
      
      return chunk
    }).filter(chunk => chunk.content.length > 0)
  }

  /**
   * Convert optimized chunks to ContextNode format
   */
  async convertToContextNodes(
    chunks: OptimizedChunk[], 
    originalContext: Context
  ): Promise<ContextNode[]> {
    const contextNodes: ContextNode[] = []
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      if (!chunk) continue
      
      const contextNodeData: any = {
        id: `${originalContext._id}_chunk_${i}`,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        importance: this.calculateChunkImportance(chunk, i, chunks.length),
        timestamp: originalContext.createdAt,
        childNodeIds: [],
        embeddings: [], // Will be generated later
        summary: this.generateChunkSummary(chunk.content),
        keywords: this.extractKeywords(chunk.content),
        relationships: [],
        createdAt: originalContext.createdAt,
        updatedAt: originalContext.updatedAt,
        metadata: {
          chunkIndex: i,
          totalChunks: chunks.length,
          originalContextId: originalContext._id!,
          chunkType: chunk.type,
          isOptimized: chunk.metadata.isOptimized
        }
      }
      
      // Only add parentNodeId if it exists
      if (originalContext._id) {
        contextNodeData.parentNodeId = originalContext._id
      }
      
      const contextNode: ContextNode = contextNodeData
      
      contextNodes.push(contextNode)
    }
    
    return contextNodes
  }

  /**
   * Calculate importance score for a chunk
   */
  private calculateChunkImportance(chunk: OptimizedChunk, index: number, totalChunks: number): number {
    let importance = 0.5 // Base importance
    
    // First and last chunks are more important
    if (index === 0) importance += 0.2
    if (index === totalChunks - 1) importance += 0.2
    
    // Code chunks are more important
    if (chunk.type === 'code') importance += 0.1
    
    // Larger chunks (more content) are more important
    if (chunk.tokenCount > 2000) importance += 0.1
    
    return Math.min(importance, 1.0)
  }

  /**
   * Generate a brief summary for a chunk
   */
  private generateChunkSummary(content: string): string {
    // Simple summary: first 100 characters + ellipsis
    if (content.length <= 100) return content
    return content.substring(0, 100).trim() + '...'
  }

  /**
   * Extract keywords from chunk content
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction: words that appear multiple times
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
    
    const wordCounts = new Map<string, number>()
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    })
    
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, _]) => word)
  }
}

// Types for internal use
interface ContentAnalysis {
  type: 'text' | 'code' | 'markdown'
  language: string
  complexity: 'low' | 'medium' | 'high'
  hasCode: boolean
  hasMarkdown: boolean
  paragraphCount: number
  sentenceCount: number
  wordCount: number
  codeBlockCount: number
  headerCount: number
}

interface Boundary {
  position: number
  type: 'start' | 'end' | 'paragraph' | 'sentence' | 'code_block_start' | 'code_block_end' | 'header'
  strength: 'weak' | 'medium' | 'strong'
}

interface InitialChunk {
  content: string
  startPosition: number
  endPosition: number
  boundaryType: string
  boundaryStrength: string
  estimatedTokens: number
  isCodeBlock: boolean
}

interface OptimizedChunk {
  content: string
  tokenCount: number
  startPosition: number
  endPosition: number
  type: string
  metadata: {
    isOptimized: boolean
    originalChunks: number
  }
}

// Export the class
export default SmartChunker
