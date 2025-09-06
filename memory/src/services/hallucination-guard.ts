import { ContextNode } from '../types';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  suggestions: string[];
  score: number;
}

export interface ValidationIssue {
  type: 'factual_inconsistency' | 'unsupported_claim' | 'contradiction' | 'hallucination' | 'ambiguity' | 'missing_context';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  suggestion: string;
}

export interface ResponseValidation {
  overallScore: number;
  factualAccuracy: number;
  contextualRelevance: number;
  completeness: number;
  consistency: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface HallucinationDetection {
  isHallucination: boolean;
  confidence: number;
  detectedPatterns: HallucinationPattern[];
  evidence: string[];
  mitigation: string[];
}

export interface HallucinationPattern {
  type: 'fabricated_fact' | 'unsupported_claim' | 'contradiction' | 'speculation_presented_as_fact' | 'out_of_scope_claim';
  description: string;
  confidence: number;
  evidence: string[];
}

export class HallucinationGuard {
  private contextProcessor: any; // ContextProcessor | null

  constructor() {
    try {
      // Import ContextProcessor dynamically to avoid circular dependencies
      const { ContextProcessor } = require('../ai/context-processor');
      this.contextProcessor = new ContextProcessor();
    } catch (error) {
      console.warn('ContextProcessor initialization failed, using fallback mode:', error);
      this.contextProcessor = null;
    }
  }

  async validateResponse(
    response: string, 
    contextNodes: ContextNode[], 
    originalQuery?: string
  ): Promise<ResponseValidation> {
    try {
      if (this.contextProcessor) {
        return await this.performAIValidation(response, contextNodes, originalQuery);
      } else {
        return await this.performFallbackValidation(response, contextNodes, originalQuery);
      }
    } catch (error) {
      console.warn('Response validation failed, using fallback:', error);
      return await this.performFallbackValidation(response, contextNodes, originalQuery);
    }
  }

  async detectHallucination(
    response: string, 
    contextNodes: ContextNode[]
  ): Promise<HallucinationDetection> {
    try {
      if (this.contextProcessor) {
        return await this.performAIHallucinationDetection(response, contextNodes);
      } else {
        return await this.performFallbackHallucinationDetection(response, contextNodes);
      }
    } catch (error) {
      console.warn('Hallucination detection failed, using fallback:', error);
      return await this.performFallbackHallucinationDetection(response, contextNodes);
    }
  }

  private async performAIValidation(
    response: string, 
    contextNodes: ContextNode[], 
    originalQuery?: string
  ): Promise<ResponseValidation> {
    const contextSummary = contextNodes.map(node => 
      `[${node.metadata?.chunkType || 'unknown'}] ${node.content.substring(0, 200)}...`
    ).join('\n');

    const validationPrompt = `
Validate the following response against the provided context. Check for factual accuracy, consistency, and relevance.

Original Query: ${originalQuery || 'Not provided'}

Context:
${contextSummary}

Response to Validate:
${response}

Please provide validation in this exact JSON format:
{
  "overallScore": 0.0-1.0,
  "factualAccuracy": 0.0-1.0,
  "contextualRelevance": 0.0-1.0,
  "completeness": 0.0-1.0,
  "consistency": 0.0-1.0,
  "issues": [
    {
      "type": "factual_inconsistency|unsupported_claim|contradiction|hallucination|ambiguity|missing_context",
      "severity": "low|medium|high|critical",
      "description": "issue description",
      "evidence": ["evidence1", "evidence2"],
      "suggestion": "suggestion for improvement"
    }
  ],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

    const aiResponse = await this.contextProcessor.generateResponse(validationPrompt);
    const validation = this.parseJsonFromMarkdown(aiResponse);
    
    return this.validateAndEnhanceValidation(validation);
  }

  private async performAIHallucinationDetection(
    response: string, 
    contextNodes: ContextNode[]
  ): Promise<HallucinationDetection> {
    const contextSummary = contextNodes.map(node => 
      `[${node.metadata?.chunkType || 'unknown'}] ${node.content.substring(0, 200)}...`
    ).join('\n');

    const detectionPrompt = `
Detect potential hallucinations in the following response by comparing it against the provided context.

Context:
${contextSummary}

Response to Check:
${response}

Look for:
1. Facts not supported by context
2. Contradictions with context
3. Speculation presented as fact
4. Claims outside the scope of context
5. Fabricated information

Please provide detection results in this exact JSON format:
{
  "isHallucination": true/false,
  "confidence": 0.0-1.0,
  "detectedPatterns": [
    {
      "type": "fabricated_fact|unsupported_claim|contradiction|speculation_presented_as_fact|out_of_scope_claim",
      "description": "pattern description",
      "confidence": 0.0-1.0,
      "evidence": ["evidence1", "evidence2"]
    }
  ],
  "evidence": ["evidence1", "evidence2"],
  "mitigation": ["mitigation1", "mitigation2"]
}`;

    const aiResponse = await this.contextProcessor.generateResponse(detectionPrompt);
    const detection = this.parseJsonFromMarkdown(aiResponse);
    
    return this.validateAndEnhanceDetection(detection);
  }

  private async performFallbackValidation(
    response: string, 
    contextNodes: ContextNode[], 
    originalQuery?: string
  ): Promise<ResponseValidation> {
    const issues: ValidationIssue[] = [];
    let overallScore = 1.0;

    // Check for factual accuracy
    const factualAccuracy = this.checkFactualAccuracy(response, contextNodes);
    if (factualAccuracy < 0.8) {
      issues.push({
        type: 'factual_inconsistency',
        severity: 'medium',
        description: 'Response may contain factual inaccuracies',
        evidence: ['Factual accuracy score below threshold'],
        suggestion: 'Verify facts against provided context'
      });
      overallScore -= 0.2;
    }

    // Check contextual relevance
    const contextualRelevance = this.checkContextualRelevance(response, contextNodes, originalQuery);
    if (contextualRelevance < 0.7) {
      issues.push({
        type: 'missing_context',
        severity: 'medium',
        description: 'Response may not be contextually relevant',
        evidence: ['Low relevance score'],
        suggestion: 'Ensure response directly addresses the query'
      });
      overallScore -= 0.15;
    }

    // Check completeness
    const completeness = this.checkCompleteness(response, originalQuery);
    if (completeness < 0.6) {
      issues.push({
        type: 'missing_context',
        severity: 'low',
        description: 'Response may be incomplete',
        evidence: ['Low completeness score'],
        suggestion: 'Provide more comprehensive information'
      });
      overallScore -= 0.1;
    }

    // Check consistency
    const consistency = this.checkConsistency(response);
    if (consistency < 0.8) {
      issues.push({
        type: 'contradiction',
        severity: 'high',
        description: 'Response contains internal contradictions',
        evidence: ['Low consistency score'],
        suggestion: 'Review response for conflicting statements'
      });
      overallScore -= 0.25;
    }

    return {
      overallScore: Math.max(0, overallScore),
      factualAccuracy,
      contextualRelevance,
      completeness,
      consistency,
      issues,
      recommendations: this.generateRecommendations(issues)
    };
  }

  private async performFallbackHallucinationDetection(
    response: string, 
    contextNodes: ContextNode[]
  ): Promise<HallucinationDetection> {
    const detectedPatterns: HallucinationPattern[] = [];
    let isHallucination = false;
    let confidence = 0.5;

    // Check for unsupported claims
    const unsupportedClaims = this.detectUnsupportedClaims(response, contextNodes);
    if (unsupportedClaims.length > 0) {
      detectedPatterns.push({
        type: 'unsupported_claim',
        description: 'Response contains claims not supported by context',
        confidence: 0.7,
        evidence: unsupportedClaims
      });
      isHallucination = true;
      confidence = Math.max(confidence, 0.7);
    }

    // Check for contradictions
    const contradictions = this.detectContradictions(response, contextNodes);
    if (contradictions.length > 0) {
      detectedPatterns.push({
        type: 'contradiction',
        description: 'Response contradicts provided context',
        confidence: 0.8,
        evidence: contradictions
      });
      isHallucination = true;
      confidence = Math.max(confidence, 0.8);
    }

    // Check for speculation presented as fact
    const speculation = this.detectSpeculationAsFact(response);
    if (speculation.length > 0) {
      detectedPatterns.push({
        type: 'speculation_presented_as_fact',
        description: 'Response presents speculation as factual information',
        confidence: 0.6,
        evidence: speculation
      });
      isHallucination = true;
      confidence = Math.max(confidence, 0.6);
    }

    return {
      isHallucination,
      confidence,
      detectedPatterns,
      evidence: detectedPatterns.flatMap(p => p.evidence),
      mitigation: this.generateMitigationStrategies(detectedPatterns)
    };
  }

  private checkFactualAccuracy(response: string, contextNodes: ContextNode[]): number {
    const contextText = contextNodes.map(node => node.content).join(' ').toLowerCase();
    const responseText = response.toLowerCase();
    
    // Simple keyword overlap check
    const contextWords = new Set(contextText.split(/\s+/).filter(w => w.length > 3));
    const responseWords = responseText.split(/\s+/).filter(w => w.length > 3);
    
    const matchingWords = responseWords.filter(word => contextWords.has(word));
    const overlapRatio = matchingWords.length / responseWords.length;
    
    return Math.min(overlapRatio * 2, 1.0); // Scale up but cap at 1.0
  }

  private checkContextualRelevance(response: string, _contextNodes: ContextNode[], originalQuery?: string): number {
    if (!originalQuery) return 0.5;
    
    const queryWords = new Set(originalQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const responseWords = response.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const matchingWords = responseWords.filter(word => queryWords.has(word));
    const relevanceRatio = matchingWords.length / queryWords.size;
    
    return Math.min(relevanceRatio, 1.0);
  }

  private checkCompleteness(response: string, originalQuery?: string): number {
    if (!originalQuery) return 0.5;
    
    // Check if response addresses key question words
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
    const queryLower = originalQuery.toLowerCase();
    const responseLower = response.toLowerCase();
    
    const addressedQuestions = questionWords.filter(qw => 
      queryLower.includes(qw) && responseLower.includes(qw)
    );
    
    return addressedQuestions.length / questionWords.length;
  }

  private checkConsistency(response: string): number {
    // Simple consistency check for contradictory statements
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length < 2) return 1.0;
    
    let consistencyScore = 1.0;
    
    // Check for obvious contradictions
    const contradictionPairs = [
      ['always', 'never'],
      ['all', 'none'],
      ['true', 'false'],
      ['yes', 'no']
    ];
    
    for (const [word1, word2] of contradictionPairs) {
      const hasWord1 = response.toLowerCase().includes(word1 || '');
      const hasWord2 = response.toLowerCase().includes(word2 || '');
      
      if (hasWord1 && hasWord2) {
        consistencyScore -= 0.3;
      }
    }
    
    return Math.max(0, consistencyScore);
  }

  private detectUnsupportedClaims(response: string, contextNodes: ContextNode[]): string[] {
    const contextText = contextNodes.map(node => node.content).join(' ').toLowerCase();
    const responseText = response.toLowerCase();
    
    const unsupported: string[] = [];
    
    // Look for specific claims that might not be in context
    const claimPatterns = [
      /\b(?:exactly|precisely|specifically)\s+\d+/g,
      /\b(?:always|never|all|none)\s+\w+/g,
      /\b(?:definitely|certainly|absolutely)\s+\w+/g
    ];
    
    claimPatterns.forEach(pattern => {
      const matches = responseText.match(pattern) || [];
      matches.forEach(match => {
        if (!contextText.includes(match.toLowerCase())) {
          unsupported.push(match);
        }
      });
    });
    
    return unsupported;
  }

  private detectContradictions(response: string, contextNodes: ContextNode[]): string[] {
    const contextText = contextNodes.map(node => node.content).join(' ').toLowerCase();
    const responseText = response.toLowerCase();
    
    const contradictions: string[] = [];
    
    // Look for statements that contradict context
    const contradictionPatterns = [
      { pattern: /(?:not|no|never)\s+\w+/, context: /(?:is|are|was|were)\s+\w+/ },
      { pattern: /(?:is|are|was|were)\s+\w+/, context: /(?:not|no|never)\s+\w+/ }
    ];
    
    contradictionPatterns.forEach(({ pattern, context: contextPattern }) => {
      const responseMatches = responseText.match(pattern) || [];
      const contextMatches = contextText.match(contextPattern) || [];
      
      responseMatches.forEach(responseMatch => {
        contextMatches.forEach(contextMatch => {
          if (this.areContradictory(responseMatch, contextMatch)) {
            contradictions.push(`${responseMatch} contradicts ${contextMatch}`);
          }
        });
      });
    });
    
    return contradictions;
  }

  private detectSpeculationAsFact(response: string): string[] {
    const speculation: string[] = [];
    
    // Look for speculation presented as fact
    const speculationPatterns = [
      /\b(?:probably|likely|might|could|may)\s+\w+/g,
      /\b(?:I think|I believe|I assume|I guess)\s+\w+/g,
      /\b(?:perhaps|possibly|maybe)\s+\w+/g
    ];
    
    speculationPatterns.forEach(pattern => {
      const matches = response.match(pattern) || [];
      speculation.push(...matches);
    });
    
    return speculation;
  }

  private areContradictory(statement1: string, statement2: string): boolean {
    // Simple contradiction detection
    const negations = ['not', 'no', 'never', 'none', 'nothing'];
    const affirmations = ['is', 'are', 'was', 'were', 'has', 'have', 'had'];
    
    const hasNegation1 = negations.some(neg => statement1.includes(neg));
    const hasNegation2 = negations.some(neg => statement2.includes(neg));
    const hasAffirmation1 = affirmations.some(aff => statement1.includes(aff));
    const hasAffirmation2 = affirmations.some(aff => statement2.includes(aff));
    
    return (hasNegation1 && hasAffirmation2) || (hasAffirmation1 && hasNegation2);
  }

  private generateRecommendations(issues: ValidationIssue[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.some(i => i.type === 'factual_inconsistency')) {
      recommendations.push('Verify all factual claims against the provided context');
    }
    
    if (issues.some(i => i.type === 'contradiction')) {
      recommendations.push('Review response for internal contradictions');
    }
    
    if (issues.some(i => i.type === 'missing_context')) {
      recommendations.push('Ensure response is complete and contextually relevant');
    }
    
    if (issues.some(i => i.severity === 'critical')) {
      recommendations.push('Consider rewriting the response to address critical issues');
    }
    
    return recommendations;
  }

  private generateMitigationStrategies(patterns: HallucinationPattern[]): string[] {
    const strategies: string[] = [];
    
    if (patterns.some(p => p.type === 'unsupported_claim')) {
      strategies.push('Only make claims that are directly supported by the provided context');
    }
    
    if (patterns.some(p => p.type === 'contradiction')) {
      strategies.push('Ensure response is consistent with the provided context');
    }
    
    if (patterns.some(p => p.type === 'speculation_presented_as_fact')) {
      strategies.push('Clearly distinguish between facts and speculation');
    }
    
    if (patterns.some(p => p.type === 'fabricated_fact')) {
      strategies.push('Avoid making up information not present in the context');
    }
    
    return strategies;
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

  private validateAndEnhanceValidation(validation: any): ResponseValidation {
    return {
      overallScore: Math.max(0, Math.min(1, validation.overallScore || 0.5)),
      factualAccuracy: Math.max(0, Math.min(1, validation.factualAccuracy || 0.5)),
      contextualRelevance: Math.max(0, Math.min(1, validation.contextualRelevance || 0.5)),
      completeness: Math.max(0, Math.min(1, validation.completeness || 0.5)),
      consistency: Math.max(0, Math.min(1, validation.consistency || 0.5)),
      issues: validation.issues || [],
      recommendations: validation.recommendations || []
    };
  }

  private validateAndEnhanceDetection(detection: any): HallucinationDetection {
    return {
      isHallucination: Boolean(detection.isHallucination),
      confidence: Math.max(0, Math.min(1, detection.confidence || 0.5)),
      detectedPatterns: detection.detectedPatterns || [],
      evidence: detection.evidence || [],
      mitigation: detection.mitigation || []
    };
  }
}
