import express from 'express';
import { AdvancedRAGSystem, RAGOptions, RerankingOptions } from '../services/advanced-rag-system';
import { EnhancedContextAnalyzer } from '../services/enhanced-context-analyzer';
import { HallucinationGuard } from '../services/hallucination-guard';
// import { ContextNode } from '../types';

const router = express.Router();
const advancedRAG = new AdvancedRAGSystem();
const enhancedAnalyzer = new EnhancedContextAnalyzer();
const hallucinationGuard = new HallucinationGuard();

// Generate RAG response
router.post('/generate', async (req, res) => {
  try {
    const { query, contextNodes, options } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query is required' 
      });
    }
    
    if (!contextNodes || !Array.isArray(contextNodes)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ContextNodes array is required' 
      });
    }
    
    const ragOptions: Partial<RAGOptions> = options || {};
    const result = await advancedRAG.generateResponse(query, contextNodes, ragOptions);
    
    return res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('RAG generation failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Analyze context with enhanced analyzer
router.post('/analyze-context', async (req, res) => {
  try {
    const { contextNode } = req.body;
    
    if (!contextNode) {
      return res.status(400).json({ 
        success: false, 
        error: 'ContextNode is required' 
      });
    }
    
    const analysis = await enhancedAnalyzer.analyzeContext(contextNode);
    
    return res.json({ 
      success: true, 
      data: analysis 
    });
  } catch (error) {
    console.error('Context analysis failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Validate response
router.post('/validate-response', async (req, res) => {
  try {
    const { response, contextNodes, originalQuery } = req.body;
    
    if (!response) {
      return res.status(400).json({ 
        success: false, 
        error: 'Response is required' 
      });
    }
    
    if (!contextNodes || !Array.isArray(contextNodes)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ContextNodes array is required' 
      });
    }
    
    const validation = await hallucinationGuard.validateResponse(response, contextNodes, originalQuery);
    
    return res.json({ 
      success: true, 
      data: validation 
    });
  } catch (error) {
    console.error('Response validation failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Detect hallucinations
router.post('/detect-hallucination', async (req, res) => {
  try {
    const { response, contextNodes } = req.body;
    
    if (!response) {
      return res.status(400).json({ 
        success: false, 
        error: 'Response is required' 
      });
    }
    
    if (!contextNodes || !Array.isArray(contextNodes)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ContextNodes array is required' 
      });
    }
    
    const detection = await hallucinationGuard.detectHallucination(response, contextNodes);
    
    return res.json({ 
      success: true, 
      data: detection 
    });
  } catch (error) {
    console.error('Hallucination detection failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Rerank context nodes
router.post('/rerank-context', async (req, res) => {
  try {
    const { contextNodes, query, rerankingOptions } = req.body;
    
    if (!contextNodes || !Array.isArray(contextNodes)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ContextNodes array is required' 
      });
    }
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query is required' 
      });
    }
    
    const options: RerankingOptions = {
      enableReranking: true,
      maxRerankCandidates: 10,
      rerankingStrategy: 'hybrid',
      diversityWeight: 0.3,
      relevanceWeight: 0.7,
      ...rerankingOptions
    };
    
    const rerankedNodes = await advancedRAG['rerankContext'](contextNodes, query, options);
    
    return res.json({ 
      success: true, 
      data: rerankedNodes 
    });
  } catch (error) {
    console.error('Context reranking failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Get RAG system status
router.get('/status', (_req, res) => {
  return res.json({
    success: true,
    data: {
      status: 'operational',
      services: {
        advancedRAG: 'available',
        enhancedAnalyzer: 'available',
        hallucinationGuard: 'available'
      },
      features: {
        reranking: true,
        validation: true,
        hallucinationDetection: true,
        enhancedAnalysis: true
      }
    }
  });
});

export default router;
