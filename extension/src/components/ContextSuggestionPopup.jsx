import React, { useState, useEffect } from 'react';
import { X, Copy, ArrowUpRight, Loader2 } from 'lucide-react';
import grad from '../assets/grad.jpg';

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
      <div
        className="rounded-lg shadow-2xl w-[380px] mx-4 max-h-[80vh] overflow-hidden text-gray-200"
        style={{
          backgroundImage: `url(${grad})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1a1f3a',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2">
            <span aria-label="Velto" className="text-white velto-brand text-[24px]">Velto</span>
            <span className="text-sm text-gray-300">Context Suggestions</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-accent" />
              <span className="ml-2 text-gray-300">Searching contexts...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No relevant contexts found</p>
              <p className="text-sm mt-1">Try rephrasing your prompt</p>
            </div>
          ) : (
            <>
              {/* User Prompt Display */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-300 mb-1">Your prompt:</p>
                <p className="text-white font-medium">{userPrompt}</p>
              </div>

              {/* Context Suggestions */}
              <div className="space-y-3">
                <h4 className="font-medium text-white">Relevant Contexts:</h4>
                {suggestions.map((context, index) => (
                  <div
                    key={context._id || context.id || index}
                    className={`border rounded-lg p-3 cursor-pointer transition-all hover:border-accent/30 ${
                      selectedContext?._id === context._id ? 'border-accent/30 bg-accent/20 shadow-glow' : 'border-gray-700 bg-gray-800/50'
                    }`}
                    onClick={() => handleContextSelect(context)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-white mb-1">
                          {context.title || 'Untitled Context'}
                        </h5>
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {context.summary || context.content?.substring(0, 100) || 'No summary available'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-gray-800/70 text-gray-300 px-2 py-1 rounded border border-gray-700">
                            {context.type || 'conversation'}
                          </span>
                          {context.source?.type && (
                            <span className="text-xs text-accent px-2 py-1 rounded border border-accent/30 bg-accent/20">{context.source.type}</span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight 
                        size={16} 
                        className={`text-gray-400 transition-colors ${
                          selectedContext?._id === context._id ? 'text-accent' : ''
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Prompt Version Display */}
              {selectedContext && (
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="font-medium text-white mb-2">Generated Prompt:</h4>
                  {isGeneratingPrompt ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={20} className="animate-spin text-accent" />
                      <span className="ml-2 text-gray-300">Generating...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                        <p className="text-sm text-gray-200 whitespace-pre-wrap">
                          {promptVersion}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleInsert}
                          disabled={!promptVersion || promptVersion.includes('Failed') || promptVersion.includes('Error')}
                          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          Insert into AI
                        </button>
                        <button
                          onClick={handleCopy}
                          disabled={!promptVersion || promptVersion.includes('Failed') || promptVersion.includes('Error')}
                          data-copy-btn
                          className="px-4 py-2 border border-gray-700 text-gray-200 rounded-lg hover:bg-gray-800 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
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
