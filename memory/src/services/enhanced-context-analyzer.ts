import { ContextNode } from '../types';
import { ContextProcessor } from '../ai/context-processor';

export interface KeyInfo {
  type: 'concept' | 'entity' | 'relationship' | 'action' | 'metric' | 'date' | 'location';
  value: string;
  confidence: number;
  context: string;
  importance: number;
}

export interface EnhancedAnalysis {
  keyInformation: KeyInfo[];
  enhancedSummary: string;
  extractedKeywords: string[];
  semanticTags: string[];
  contentStructure: ContentStructure;
  qualityMetrics: QualityMetrics;
  contextualInsights: ContextualInsight[];
}

export interface ContentStructure {
  sections: ContentSection[];
  hierarchy: HierarchyNode[];
  flow: ContentFlow;
}

export interface ContentSection {
  title: string;
  startIndex: number;
  endIndex: number;
  type: 'introduction' | 'main_content' | 'conclusion' | 'code' | 'data' | 'explanation';
  importance: number;
  keyPoints: string[];
}

export interface HierarchyNode {
  level: number;
  title: string;
  children: HierarchyNode[];
  content: string;
}

export interface ContentFlow {
  transitions: Transition[];
  logicalConnections: LogicalConnection[];
  narrativeArc: string;
}

export interface Transition {
  from: string;
  to: string;
  type: 'causal' | 'temporal' | 'logical' | 'comparative';
  strength: number;
}

export interface LogicalConnection {
  concept1: string;
  concept2: string;
  relationship: string;
  strength: number;
}

export interface QualityMetrics {
  clarity: number;
  completeness: number;
  coherence: number;
  relevance: number;
  accuracy: number;
  overall: number;
}

export interface ContextualInsight {
  type: 'pattern' | 'anomaly' | 'trend' | 'correlation' | 'implication';
  description: string;
  confidence: number;
  evidence: string[];
  impact: 'high' | 'medium' | 'low';
}

export class EnhancedContextAnalyzer {
  private contextProcessor: ContextProcessor | null;

  constructor() {
    try {
      this.contextProcessor = new ContextProcessor();
    } catch (error) {
      console.warn('ContextProcessor initialization failed, using fallback mode:', error);
      this.contextProcessor = null;
    }
  }

  async analyzeContext(node: ContextNode): Promise<EnhancedAnalysis> {
    try {
      if (this.contextProcessor) {
        return await this.performAIAnalysis(node);
      } else {
        return await this.performFallbackAnalysis(node);
      }
    } catch (error) {
      console.warn('Enhanced context analysis failed, using fallback:', error);
      return await this.performFallbackAnalysis(node);
    }
  }

  private async performAIAnalysis(node: ContextNode): Promise<EnhancedAnalysis> {
    const analysisPrompt = `
Analyze the following context node and provide a comprehensive analysis in JSON format:

Context Node:
- Content: ${node.content}
- Type: ${node.metadata?.chunkType || 'unknown'}
- Timestamp: ${node.timestamp}
- Importance: ${node.importance}

Please provide analysis in this exact JSON format:
{
  "keyInformation": [
    {
      "type": "concept|entity|relationship|action|metric|date|location",
      "value": "extracted value",
      "confidence": 0.0-1.0,
      "context": "surrounding context",
      "importance": 0.0-1.0
    }
  ],
  "enhancedSummary": "comprehensive summary",
  "extractedKeywords": ["keyword1", "keyword2"],
  "semanticTags": ["tag1", "tag2"],
  "contentStructure": {
    "sections": [
      {
        "title": "section title",
        "startIndex": 0,
        "endIndex": 100,
        "type": "introduction|main_content|conclusion|code|data|explanation",
        "importance": 0.0-1.0,
        "keyPoints": ["point1", "point2"]
      }
    ],
    "hierarchy": [
      {
        "level": 1,
        "title": "title",
        "children": [],
        "content": "content"
      }
    ],
    "flow": {
      "transitions": [
        {
          "from": "concept1",
          "to": "concept2",
          "type": "causal|temporal|logical|comparative",
          "strength": 0.0-1.0
        }
      ],
      "logicalConnections": [
        {
          "concept1": "concept1",
          "concept2": "concept2",
          "relationship": "relationship description",
          "strength": 0.0-1.0
        }
      ],
      "narrativeArc": "description of content flow"
    }
  },
  "qualityMetrics": {
    "clarity": 0.0-1.0,
    "completeness": 0.0-1.0,
    "coherence": 0.0-1.0,
    "relevance": 0.0-1.0,
    "accuracy": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "contextualInsights": [
    {
      "type": "pattern|anomaly|trend|correlation|implication",
      "description": "insight description",
      "confidence": 0.0-1.0,
      "evidence": ["evidence1", "evidence2"],
      "impact": "high|medium|low"
    }
  ]
}`;

    const response = await this.contextProcessor!.generateResponse(analysisPrompt);
    const analysis = this.parseJsonFromMarkdown(response);
    
    return this.validateAndEnhanceAnalysis(analysis, node);
  }

  private async performFallbackAnalysis(node: ContextNode): Promise<EnhancedAnalysis> {
    const content = node.content;
    
    // Extract key information using rule-based approach
    const keyInformation = this.extractKeyInformationFallback(content);
    
    // Generate enhanced summary
    const enhancedSummary = this.generateEnhancedSummaryFallback(content, node);
    
    // Extract keywords
    const extractedKeywords = this.extractKeywordsFallback(content);
    
    // Generate semantic tags
    const semanticTags = this.generateSemanticTagsFallback(content, node);
    
    // Analyze content structure
    const contentStructure = this.analyzeContentStructureFallback(content);
    
    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetricsFallback(content, node);
    
    // Generate contextual insights
    const contextualInsights = this.generateContextualInsightsFallback(content, node);

    return {
      keyInformation,
      enhancedSummary,
      extractedKeywords,
      semanticTags,
      contentStructure,
      qualityMetrics,
      contextualInsights
    };
  }

  private extractKeyInformationFallback(content: string): KeyInfo[] {
    const keyInfo: KeyInfo[] = [];
    
    // Extract entities (capitalized words, technical terms)
    const entityPattern = /\b[A-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)*\b/g;
    const entities = content.match(entityPattern) || [];
    
    entities.forEach(entity => {
      if (entity.length > 2) {
        keyInfo.push({
          type: 'entity',
          value: entity,
          confidence: 0.7,
          context: this.getContextAround(content, entity),
          importance: this.calculateImportance(entity, content)
        });
      }
    });

    // Extract metrics (numbers with units)
    const metricPattern = /\b\d+(?:\.\d+)?\s*(?:ms|s|min|hour|day|week|month|year|%|px|mb|gb|kb|bytes?|tokens?|requests?|users?|projects?|files?|lines?|characters?)\b/gi;
    const metrics = content.match(metricPattern) || [];
    
    metrics.forEach(metric => {
      keyInfo.push({
        type: 'metric',
        value: metric,
        confidence: 0.8,
        context: this.getContextAround(content, metric),
        importance: 0.6
      });
    });

    // Extract dates
    const datePattern = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}|\b\d{1,2}\/\d{1,2}\/\d{4}|\b\d{4}-\d{2}-\d{2}\b/gi;
    const dates = content.match(datePattern) || [];
    
    dates.forEach(date => {
      keyInfo.push({
        type: 'date',
        value: date,
        confidence: 0.9,
        context: this.getContextAround(content, date),
        importance: 0.5
      });
    });

    return keyInfo;
  }

  private generateEnhancedSummaryFallback(content: string, node: ContextNode): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const firstSentence = sentences[0]?.trim() || '';
    const lastSentence = sentences[sentences.length - 1]?.trim() || '';
    
    let summary = firstSentence;
    if (sentences.length > 1) {
      summary += ` ${lastSentence}`;
    }
    
    // Add context about the node type
    if (node.metadata?.chunkType) {
      summary = `[${node.metadata.chunkType.toUpperCase()}] ${summary}`;
    }
    
    return summary;
  }

  private extractKeywordsFallback(content: string): string[] {
    // Simple keyword extraction based on frequency and length
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private generateSemanticTagsFallback(content: string, node: ContextNode): string[] {
    const tags: string[] = [];
    
    // Add chunk type as tag
    if (node.metadata?.chunkType) {
      tags.push(node.metadata.chunkType);
    }
    
    // Add content-based tags
    if (content.includes('function') || content.includes('class') || content.includes('const')) {
      tags.push('code');
    }
    if (content.includes('error') || content.includes('exception') || content.includes('failed')) {
      tags.push('error');
    }
    if (content.includes('test') || content.includes('spec') || content.includes('assert')) {
      tags.push('testing');
    }
    if (content.includes('api') || content.includes('endpoint') || content.includes('request')) {
      tags.push('api');
    }
    if (content.includes('database') || content.includes('collection') || content.includes('query')) {
      tags.push('database');
    }
    
    return tags;
  }

  private analyzeContentStructureFallback(content: string): ContentStructure {
    const sections: ContentSection[] = [];
    const lines = content.split('\n');
    
    let currentSection: ContentSection | null = null;
    let sectionIndex = 0;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.length === 0) return;
      
      // Detect section headers
      if (trimmedLine.startsWith('#') || trimmedLine.endsWith(':') || 
          trimmedLine.match(/^[A-Z][A-Z\s]+$/)) {
        
        if (currentSection) {
          currentSection.endIndex = index - 1;
          sections.push(currentSection);
        }
        
        currentSection = {
          title: trimmedLine.replace(/^#+\s*/, ''),
          startIndex: index,
          endIndex: index,
          type: this.detectSectionType(trimmedLine),
          importance: this.calculateSectionImportance(trimmedLine),
          keyPoints: []
        };
        sectionIndex++;
      } else if (currentSection) {
        currentSection.keyPoints.push(trimmedLine);
      }
    });
    
    if (currentSection) {
      (currentSection as any).endIndex = lines.length - 1;
      sections.push(currentSection);
    }
    
    return {
      sections,
      hierarchy: this.buildHierarchyFallback(sections),
      flow: this.analyzeFlowFallback(sections)
    };
  }

  private detectSectionType(line: string): ContentSection['type'] {
    if (line.includes('introduction') || line.includes('overview')) return 'introduction';
    if (line.includes('code') || line.includes('function') || line.includes('class')) return 'code';
    if (line.includes('data') || line.includes('result') || line.includes('output')) return 'data';
    if (line.includes('conclusion') || line.includes('summary')) return 'conclusion';
    return 'main_content';
  }

  private calculateSectionImportance(line: string): number {
    if (line.includes('important') || line.includes('critical') || line.includes('key')) return 0.9;
    if (line.includes('note') || line.includes('warning') || line.includes('error')) return 0.8;
    if (line.includes('example') || line.includes('demo')) return 0.6;
    return 0.5;
  }

  private buildHierarchyFallback(sections: ContentSection[]): HierarchyNode[] {
    return sections.map((section) => ({
      level: 1,
      title: section.title,
      children: [],
      content: section.keyPoints.join(' ')
    }));
  }

  private analyzeFlowFallback(sections: ContentSection[]): ContentFlow {
    const transitions: Transition[] = [];
    const logicalConnections: LogicalConnection[] = [];
    
    for (let i = 0; i < sections.length - 1; i++) {
      const current = sections[i];
      const next = sections[i + 1];
      
      if (current && next) {
        transitions.push({
          from: current.title,
          to: next.title,
          type: 'logical',
          strength: 0.7
        });
      }
    }
    
    return {
      transitions,
      logicalConnections,
      narrativeArc: 'Sequential progression through content sections'
    };
  }

  private calculateQualityMetricsFallback(content: string, node: ContextNode): QualityMetrics {
    const clarity = this.calculateClarity(content);
    const completeness = this.calculateCompleteness(content);
    const coherence = this.calculateCoherence(content);
    const relevance = node.importance || 0.5;
    const accuracy = 0.8; // Default assumption
    
    return {
      clarity,
      completeness,
      coherence,
      relevance,
      accuracy,
      overall: (clarity + completeness + coherence + relevance + accuracy) / 5
    };
  }

  private calculateClarity(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    
    // Shorter sentences are generally clearer
    if (avgLength < 50) return 0.9;
    if (avgLength < 100) return 0.7;
    if (avgLength < 150) return 0.5;
    return 0.3;
  }

  private calculateCompleteness(content: string): number {
    const hasIntroduction = content.toLowerCase().includes('introduction') || 
                           content.toLowerCase().includes('overview');
    const hasDetails = content.length > 100;
    const hasConclusion = content.toLowerCase().includes('conclusion') || 
                         content.toLowerCase().includes('summary');
    
    let score = 0;
    if (hasIntroduction) score += 0.3;
    if (hasDetails) score += 0.4;
    if (hasConclusion) score += 0.3;
    
    return Math.min(score, 1.0);
  }

  private calculateCoherence(content: string): number {
    // Simple coherence based on sentence transitions
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 1.0;
    
    let transitions = 0;
    const transitionWords = ['however', 'therefore', 'furthermore', 'moreover', 'additionally', 'consequently'];
    
    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i]?.toLowerCase();
      if (sentence && transitionWords.some(word => sentence.includes(word))) {
        transitions++;
      }
    }
    
    return Math.min(transitions / (sentences.length - 1), 1.0);
  }

  private generateContextualInsightsFallback(content: string, _node: ContextNode): ContextualInsight[] {
    const insights: ContextualInsight[] = [];
    
    // Detect patterns
    if (content.includes('error') && content.includes('fix')) {
      insights.push({
        type: 'pattern',
        description: 'Error-fix pattern detected',
        confidence: 0.8,
        evidence: ['Contains error references', 'Contains fix references'],
        impact: 'medium'
      });
    }
    
    // Detect anomalies
    if (content.length > 5000) {
      insights.push({
        type: 'anomaly',
        description: 'Unusually long content chunk',
        confidence: 0.9,
        evidence: [`Content length: ${content.length} characters`],
        impact: 'high'
      });
    }
    
    return insights;
  }

  private getContextAround(content: string, term: string, contextLength: number = 50): string {
    const index = content.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + term.length + contextLength);
    
    return content.substring(start, end);
  }

  private calculateImportance(term: string, content: string): number {
    const frequency = (content.toLowerCase().match(new RegExp(term.toLowerCase(), 'g')) || []).length;
    const contentLength = content.length;
    const relativeFrequency = frequency / (contentLength / 1000); // per 1000 chars
    
    return Math.min(relativeFrequency / 10, 1.0); // Normalize to 0-1
  }

  private parseJsonFromMarkdown(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (parseError) {
          console.warn('Failed to parse JSON from markdown:', parseError);
        }
      }
      
      const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch && jsonObjectMatch[0]) {
        try {
          return JSON.parse(jsonObjectMatch[0]);
        } catch (parseError) {
          console.warn('Failed to parse JSON object:', parseError);
        }
      }
      
      return {};
    }
  }

  private validateAndEnhanceAnalysis(analysis: any, node: ContextNode): EnhancedAnalysis {
    return {
      keyInformation: analysis.keyInformation || [],
      enhancedSummary: analysis.enhancedSummary || node.summary || 'No summary available',
      extractedKeywords: analysis.extractedKeywords || [],
      semanticTags: analysis.semanticTags || [],
      contentStructure: analysis.contentStructure || {
        sections: [],
        hierarchy: [],
        flow: { transitions: [], logicalConnections: [], narrativeArc: 'Unknown' }
      },
      qualityMetrics: analysis.qualityMetrics || {
        clarity: 0.5,
        completeness: 0.5,
        coherence: 0.5,
        relevance: node.importance || 0.5,
        accuracy: 0.5,
        overall: 0.5
      },
      contextualInsights: analysis.contextualInsights || []
    };
  }
}
