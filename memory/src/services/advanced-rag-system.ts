import { ContextNode } from '../types';
import { HallucinationGuard, ResponseValidation, HallucinationDetection } from './hallucination-guard';
// import { EnhancedContextAnalyzer } from './enhanced-context-analyzer';

export interface RAGResponse {
  response: string;
  confidence: number;
  sources: ContextNode[];
  metadata: RAGMetadata;
  validation: ResponseValidation;
  hallucinationDetection: HallucinationDetection;
}

export interface RAGMetadata {
  processingTime: number;
  tokensUsed: number;
  rerankingApplied: boolean;
  validationPassed: boolean;
  qualityScore: number;
  contextRelevance: number;
  responseLength: number;
}

export interface RerankingOptions {
  enableReranking: boolean;
  maxRerankCandidates: number;
  rerankingStrategy: 'relevance' | 'diversity' | 'hybrid';
  diversityWeight: number;
  relevanceWeight: number;
}

export interface RAGOptions {
  maxTokens: number;
  temperature: number;
  enableValidation: boolean;
  enableHallucinationDetection: boolean;
  rerankingOptions: RerankingOptions;
  qualityThreshold: number;
  contextWindowSize: number;
}

export interface RerankedNode {
  node: ContextNode;
  originalScore: number;
  rerankedScore: number;
  rerankingReason: string;
  diversityScore: number;
  relevanceScore: number;
}

export class AdvancedRAGSystem {
  private hallucinationGuard: HallucinationGuard;
  // private enhancedAnalyzer: EnhancedContextAnalyzer;
  private contextProcessor: any; // ContextProcessor | null

  constructor() {
    this.hallucinationGuard = new HallucinationGuard();
    // this.enhancedAnalyzer = new EnhancedContextAnalyzer();
    
    try {
      const { ContextProcessor } = require('../ai/context-processor');
      this.contextProcessor = new ContextProcessor();
    } catch (error) {
      console.warn('ContextProcessor initialization failed, using fallback mode:', error);
      this.contextProcessor = null;
    }
  }

  async generateResponse(
    query: string,
    contextNodes: ContextNode[],
    options: Partial<RAGOptions> = {}
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    const defaultOptions: RAGOptions = {
      maxTokens: 2000,
      temperature: 0.7,
      enableValidation: true,
      enableHallucinationDetection: true,
      rerankingOptions: {
        enableReranking: true,
        maxRerankCandidates: 10,
        rerankingStrategy: 'hybrid',
        diversityWeight: 0.3,
        relevanceWeight: 0.7
      },
      qualityThreshold: 0.7,
      contextWindowSize: 8000
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      // Step 1: Rerank context nodes
      const rerankedNodes = await this.rerankContext(contextNodes, query, finalOptions.rerankingOptions);
      
      // Step 2: Select optimal context window
      const selectedNodes = this.selectOptimalContext(rerankedNodes, finalOptions);
      
      // Step 3: Generate response
      const response = await this.generateResponseFromContext(query, selectedNodes, finalOptions);
      
      // Step 4: Validate response
      let validation: ResponseValidation;
      let hallucinationDetection: HallucinationDetection;
      
      if (finalOptions.enableValidation) {
        validation = await this.hallucinationGuard.validateResponse(response, selectedNodes, query);
      } else {
        validation = this.createDefaultValidation();
      }
      
      if (finalOptions.enableHallucinationDetection) {
        hallucinationDetection = await this.hallucinationGuard.detectHallucination(response, selectedNodes);
      } else {
        hallucinationDetection = this.createDefaultHallucinationDetection();
      }
      
      // Step 5: Calculate metadata
      const processingTime = Date.now() - startTime;
      const metadata = this.calculateMetadata(
        response,
        selectedNodes,
        processingTime,
        finalOptions,
        validation,
        hallucinationDetection
      );
      
      // Step 6: Check quality threshold
      if (metadata.qualityScore < finalOptions.qualityThreshold) {
        console.warn(`Response quality below threshold: ${metadata.qualityScore} < ${finalOptions.qualityThreshold}`);
      }

      return {
        response,
        confidence: this.calculateConfidence(validation, hallucinationDetection),
        sources: selectedNodes,
        metadata,
        validation,
        hallucinationDetection
      };

    } catch (error) {
      console.error('Advanced RAG generation failed:', error);
      throw new Error(`RAG generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async rerankContext(
    contextNodes: ContextNode[],
    query: string,
    options: RerankingOptions
  ): Promise<RerankedNode[]> {
    if (!options.enableReranking || contextNodes.length <= 1) {
      return contextNodes.map(node => ({
        node,
        originalScore: node.importance || 0.5,
        rerankedScore: node.importance || 0.5,
        rerankingReason: 'No reranking applied',
        diversityScore: 0,
        relevanceScore: node.importance || 0.5
      }));
    }

    const rerankedNodes: RerankedNode[] = [];
    
    for (const node of contextNodes) {
      const relevanceScore = await this.calculateRelevanceScore(node, query);
      const diversityScore = this.calculateDiversityScore(node, rerankedNodes);
      
      let rerankedScore: number;
      let rerankingReason: string;
      
      switch (options.rerankingStrategy) {
        case 'relevance':
          rerankedScore = relevanceScore;
          rerankingReason = 'Relevance-based reranking';
          break;
        case 'diversity':
          rerankedScore = diversityScore;
          rerankingReason = 'Diversity-based reranking';
          break;
        case 'hybrid':
          rerankedScore = (options.relevanceWeight * relevanceScore) + 
                         (options.diversityWeight * diversityScore);
          rerankingReason = 'Hybrid relevance-diversity reranking';
          break;
        default:
          rerankedScore = relevanceScore;
          rerankingReason = 'Default reranking';
      }
      
      rerankedNodes.push({
        node,
        originalScore: node.importance || 0.5,
        rerankedScore,
        rerankingReason,
        diversityScore,
        relevanceScore
      });
    }
    
    // Sort by reranked score and limit candidates
    return rerankedNodes
      .sort((a, b) => b.rerankedScore - a.rerankedScore)
      .slice(0, options.maxRerankCandidates);
  }

  private async calculateRelevanceScore(node: ContextNode, query: string): Promise<number> {
    if (this.contextProcessor) {
      try {
        const relevancePrompt = `
Calculate the relevance score (0.0-1.0) between the following query and context node.

Query: ${query}

Context Node:
- Content: ${node.content.substring(0, 500)}...
- Type: ${node.metadata?.chunkType || 'unknown'}
- Keywords: ${node.keywords?.join(', ') || 'none'}

Consider:
1. Semantic similarity
2. Keyword overlap
3. Contextual relevance
4. Information completeness

Respond with only a number between 0.0 and 1.0:`;

        const response = await this.contextProcessor.generateResponse(relevancePrompt);
        const score = parseFloat(response.trim());
        return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
      } catch (error) {
        console.warn('AI relevance calculation failed, using fallback:', error);
      }
    }
    
    // Fallback relevance calculation
    return this.calculateFallbackRelevance(node, query);
  }

  private calculateFallbackRelevance(node: ContextNode, query: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const contentWords = node.content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const keywordWords = (node.keywords || []).map(k => k.toLowerCase());
    
    // Calculate keyword overlap
    const keywordOverlap = keywordWords.filter(kw => queryWords.has(kw)).length / Math.max(keywordWords.length, 1);
    
    // Calculate content overlap
    const contentOverlap = contentWords.filter(cw => queryWords.has(cw)).length / Math.max(contentWords.length, 1);
    
    // Calculate semantic similarity (simplified)
    const semanticScore = this.calculateSemanticSimilarity(query, node.content);
    
    // Combine scores
    return (keywordOverlap * 0.4) + (contentOverlap * 0.3) + (semanticScore * 0.3);
  }

  private calculateSemanticSimilarity(text1: string, text2: string): number {
    // Simple semantic similarity based on word co-occurrence
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private calculateDiversityScore(node: ContextNode, existingNodes: RerankedNode[]): number {
    if (existingNodes.length === 0) return 1.0;
    
    let totalSimilarity = 0;
    
    for (const existing of existingNodes) {
      const similarity = this.calculateSemanticSimilarity(node.content, existing.node.content);
      totalSimilarity += similarity;
    }
    
    const avgSimilarity = totalSimilarity / existingNodes.length;
    return 1.0 - avgSimilarity; // Higher diversity = lower similarity
  }

  private selectOptimalContext(rerankedNodes: RerankedNode[], _options: RAGOptions): ContextNode[] {
    const selectedNodes: ContextNode[] = [];
    let totalTokens = 0;
    
    for (const reranked of rerankedNodes) {
      const nodeTokens = this.estimateTokens(reranked.node.content);
      
      if (totalTokens + nodeTokens <= _options.contextWindowSize) {
        selectedNodes.push(reranked.node);
        totalTokens += nodeTokens;
      } else {
        // Try to include partial content if it's the first node
        if (selectedNodes.length === 0) {
          const partialContent = this.truncateToTokenLimit(
            reranked.node.content, 
            _options.contextWindowSize
          );
          selectedNodes.push({
            ...reranked.node,
            content: partialContent
          });
        }
        break;
      }
    }
    
    return selectedNodes;
  }

  private async generateResponseFromContext(
    query: string,
    contextNodes: ContextNode[],
    _options: RAGOptions
  ): Promise<string> {
    if (this.contextProcessor) {
      try {
        const contextText = this.formatContextForGeneration(contextNodes);
        
        const generationPrompt = `
Based on the provided context, answer the following query accurately and comprehensively.

Query: ${query}

Context:
${contextText}

Instructions:
1. Answer based only on the provided context
2. If information is not available in the context, say so
3. Be specific and detailed
4. Maintain accuracy and avoid speculation
5. Use clear, concise language

Response:`;

        return await this.contextProcessor.generateResponse(generationPrompt);
      } catch (error) {
        console.warn('AI response generation failed, using fallback:', error);
      }
    }
    
    // Fallback response generation
    return this.generateFallbackResponse(query, contextNodes);
  }

  private formatContextForGeneration(contextNodes: ContextNode[]): string {
    return contextNodes.map((node, index) => {
      const type = node.metadata?.chunkType || 'unknown';
      const title = node.title || `Context ${index + 1}`;
      return `[${type.toUpperCase()}] ${title}\n${node.content}`;
    }).join('\n\n---\n\n');
  }

  private generateFallbackResponse(query: string, contextNodes: ContextNode[]): string {
    if (contextNodes.length === 0) {
      return "I don't have enough context to answer this query. Please provide more relevant information.";
    }
    
    const contextText = contextNodes.map(node => node.content).join(' ');
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    // Find the most relevant sentences
    const sentences = contextText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const relevantSentences = sentences.filter(sentence => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      return queryWords.some(qw => sentenceWords.includes(qw));
    });
    
    if (relevantSentences.length === 0) {
      return "Based on the provided context, I cannot find specific information to answer your query. The context may not contain relevant details.";
    }
    
    return relevantSentences.slice(0, 3).join('. ') + '.';
  }

  private calculateMetadata(
    response: string,
    selectedNodes: ContextNode[],
    processingTime: number,
    _options: RAGOptions,
    validation: ResponseValidation,
    hallucinationDetection: HallucinationDetection
  ): RAGMetadata {
    const tokensUsed = this.estimateTokens(response);
    const qualityScore = this.calculateQualityScore(validation, hallucinationDetection);
    const contextRelevance = this.calculateContextRelevance(response, selectedNodes);
    
    return {
      processingTime,
      tokensUsed,
      rerankingApplied: _options.rerankingOptions.enableReranking,
      validationPassed: validation.overallScore >= _options.qualityThreshold,
      qualityScore,
      contextRelevance,
      responseLength: response.length
    };
  }

  private calculateQualityScore(validation: ResponseValidation, hallucinationDetection: HallucinationDetection): number {
    const validationScore = validation.overallScore;
    const hallucinationScore = hallucinationDetection.isHallucination ? 0.2 : 0.8;
    
    return (validationScore + hallucinationScore) / 2;
  }

  private calculateContextRelevance(response: string, contextNodes: ContextNode[]): number {
    if (contextNodes.length === 0) return 0;
    
    const contextText = contextNodes.map(node => node.content).join(' ').toLowerCase();
    const responseText = response.toLowerCase();
    
    const contextWords = new Set(contextText.split(/\s+/).filter(w => w.length > 2));
    const responseWords = responseText.split(/\s+/).filter(w => w.length > 2);
    
    const matchingWords = responseWords.filter(word => contextWords.has(word));
    return matchingWords.length / responseWords.length;
  }

  private calculateConfidence(validation: ResponseValidation, hallucinationDetection: HallucinationDetection): number {
    const validationConfidence = validation.overallScore;
    const hallucinationConfidence = hallucinationDetection.isHallucination ? 
      (1 - hallucinationDetection.confidence) : hallucinationDetection.confidence;
    
    return (validationConfidence + hallucinationConfidence) / 2;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokens(text);
    if (estimatedTokens <= maxTokens) return text;
    
    const targetLength = Math.floor((text.length * maxTokens) / estimatedTokens);
    return text.substring(0, targetLength) + '...';
  }

  private createDefaultValidation(): ResponseValidation {
    return {
      overallScore: 0.5,
      factualAccuracy: 0.5,
      contextualRelevance: 0.5,
      completeness: 0.5,
      consistency: 0.5,
      issues: [],
      recommendations: []
    };
  }

  private createDefaultHallucinationDetection(): HallucinationDetection {
    return {
      isHallucination: false,
      confidence: 0.5,
      detectedPatterns: [],
      evidence: [],
      mitigation: []
    };
  }
}
