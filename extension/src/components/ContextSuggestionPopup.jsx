import React, { useState, useEffect } from 'react';
import { X, Copy, ArrowUpRight, Loader2 } from 'lucide-react';

const ContextSuggestionPopup = ({ 
  isVisible, 
  onClose, 
  suggestions, 
  onInsert, 
  userPrompt,
  isLoading = false 
}) => {
  const [selectedContext, setSelectedContext] = useState(null);
  const [promptVersion, setPromptVersion] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setSelectedContext(null);
      setPromptVersion('');
    }
  }, [isVisible]);

  const handleContextSelect = async (context) => {
    setSelectedContext(context);
    setIsGeneratingPrompt(true);
    
    try {
      // Call the prompt version API
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PROMPT_VERSION',
        payload: {
          contextId: context._id || context.id,
          userPrompt: userPrompt
        }
      });
      
      if (response?.success && response.data?.promptVersion) {
        setPromptVersion(response.data.promptVersion);
      } else {
        setPromptVersion('Failed to generate prompt version');
      }
    } catch (error) {
      console.error('Failed to generate prompt version:', error);
      setPromptVersion('Error generating prompt version');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleInsert = () => {
    if (promptVersion && selectedContext) {
      onInsert(promptVersion, selectedContext);
      onClose();
    }
  };

  const handleCopy = async () => {
    if (promptVersion) {
      try {
        await navigator.clipboard.writeText(promptVersion);
        // Show temporary success feedback
        const copyBtn = document.querySelector('[data-copy-btn]');
        if (copyBtn) {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-lg font-semibold text-gray-900">
            Context Suggestions
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Searching contexts...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No relevant contexts found</p>
              <p className="text-sm mt-1">Try rephrasing your prompt</p>
            </div>
          ) : (
            <>
              {/* User Prompt Display */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600 mb-1">Your prompt:</p>
                <p className="text-gray-900 font-medium">{userPrompt}</p>
              </div>

              {/* Context Suggestions */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Relevant Contexts:</h4>
                {suggestions.map((context, index) => (
                  <div
                    key={context._id || context.id || index}
                    className={`border rounded-lg p-3 cursor-pointer transition-all hover:border-blue-300 ${
                      selectedContext?._id === context._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleContextSelect(context)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 mb-1">
                          {context.title || 'Untitled Context'}
                        </h5>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {context.summary || context.content?.substring(0, 100) || 'No summary available'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {context.type || 'conversation'}
                          </span>
                          {context.source?.type && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                              {context.source.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight 
                        size={16} 
                        className={`text-gray-400 transition-colors ${
                          selectedContext?._id === context._id ? 'text-blue-500' : ''
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Prompt Version Display */}
              {selectedContext && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Generated Prompt:</h4>
                  {isGeneratingPrompt ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={20} className="animate-spin text-blue-500" />
                      <span className="ml-2 text-gray-600">Generating...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {promptVersion}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleInsert}
                          disabled={!promptVersion || promptVersion.includes('Failed') || promptVersion.includes('Error')}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          Insert into AI
                        </button>
                        <button
                          onClick={handleCopy}
                          disabled={!promptVersion || promptVersion.includes('Failed') || promptVersion.includes('Error')}
                          data-copy-btn
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextSuggestionPopup;
