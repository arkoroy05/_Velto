import express from 'express';
import { ContextInsertionManager, ContextInsertionRequest } from '../services/context-insertion-manager';

const router = express.Router();
const contextInsertionManager = new ContextInsertionManager();

/**
 * POST /api/v1/context-insertion/generate
 * Generate context insertion block for a user prompt
 */
router.post('/generate', async (req, res) => {
  try {
    const { userPrompt, projectId, userId, maxTokens, contextType, priority } = req.body;

    // Validate required fields
    if (!userPrompt || !projectId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userPrompt, projectId, userId'
      });
    }

    // Validate userPrompt is not empty
    if (typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userPrompt must be a non-empty string'
      });
    }

    // Validate projectId and userId are valid ObjectIds
    if (typeof projectId !== 'string' || projectId.length !== 24) {
      return res.status(400).json({
        success: false,
        error: 'projectId must be a valid 24-character hex string'
      });
    }

    if (typeof userId !== 'string' || userId.length !== 24) {
      return res.status(400).json({
        success: false,
        error: 'userId must be a valid 24-character hex string'
      });
    }

    // Validate optional fields
    const validContextTypes = ['conversation', 'document', 'mixed'];
    if (contextType && !validContextTypes.includes(contextType)) {
      return res.status(400).json({
        success: false,
        error: `contextType must be one of: ${validContextTypes.join(', ')}`
      });
    }

    const validPriorities = ['relevance', 'recency', 'importance'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `priority must be one of: ${validPriorities.join(', ')}`
      });
    }

    if (maxTokens && (typeof maxTokens !== 'number' || maxTokens < 100 || maxTokens > 10000)) {
      return res.status(400).json({
        success: false,
        error: 'maxTokens must be a number between 100 and 10000'
      });
    }

    const request: ContextInsertionRequest = {
      userPrompt: userPrompt.trim(),
      projectId,
      userId,
      maxTokens: maxTokens || 2000,
      contextType: contextType || 'mixed',
      priority: priority || 'relevance'
    };

    const result = await contextInsertionManager.generateContextInsertion(request);

    return res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Context insertion generation failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/context-insertion/analyze-prompt
 * Analyze a user prompt to extract intent and context requirements
 */
router.post('/analyze-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'prompt must be a non-empty string'
      });
    }

    // Use the private method through a public wrapper
    const analysis = await contextInsertionManager['analyzePrompt'](prompt.trim());

    return res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Prompt analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/context-insertion/health
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
  return res.json({
    success: true,
    message: 'Context insertion service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;

