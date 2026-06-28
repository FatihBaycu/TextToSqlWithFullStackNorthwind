import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Database, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Trash2,
  Cpu,
  Archive
} from 'lucide-react';
import { api } from '../api';

export default function Chat() {
  const INITIAL_MESSAGE = {
    id: '1',
    role: 'assistant',
    status: 'complete',
    content: 'Hello! I am your AI Text-to-SQL assistant. Ask me anything about the Northwind database (e.g., orders, sales, customer locations, product prices), and I will generate the query, execute it safely, and format the results.',
    suggestions: [
      'Show me all orders from Germany',
      'Count customers by country',
      'What are the 5 most expensive products?',
      'Calculate total revenue by category'
    ]
  };

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  // Model selection states
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('auto');

  const messagesEndRef = useRef(null);

  // Load models and chat history on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const loadedModels = await api.getModels();
        setModels(loadedModels || []);
      } catch (err) {
        console.warn('[Chat] Failed to load models:', err);
      }
    };
    
    // Load history from localStorage
    const saved = localStorage.getItem('sql_assistant_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Tag loaded items as historical for styling, exclude suggestions for historical ones
        const tagged = parsed.map(m => ({ 
          ...m, 
          isHistorical: true,
          suggestions: undefined // clear onboarding suggestions for old records to declutter
        }));
        setMessages(tagged);
      } catch (err) {
        console.error('[Chat] Failed to parse localStorage history:', err);
        setMessages([INITIAL_MESSAGE]);
      }
    } else {
      setMessages([INITIAL_MESSAGE]);
    }

    fetchModels();
  }, []);

  // Save history to localStorage whenever messages list changes (limit to 20 entries)
  const saveMessages = (msgs) => {
    try {
      const trimmed = msgs.slice(-20);
      localStorage.setItem('sql_assistant_messages', JSON.stringify(trimmed));
    } catch (err) {
      console.error('[Chat] LocalStorage write failed:', err);
    }
  };

  // Scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
  };

  const handleClearChat = () => {
    if (window.confirm('Wipe conversation history? This will delete saved local data.')) {
      setMessages([INITIAL_MESSAGE]);
      localStorage.removeItem('sql_assistant_messages');
    }
  };

  const handleCopySql = async (sqlText, messageId) => {
    try {
      await navigator.clipboard.writeText(sqlText);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleExportCSV = (queryResult) => {
    if (!queryResult || !queryResult.rows || queryResult.rows.length === 0) return;

    try {
      const fields = queryResult.fields.map(f => f.name);
      const csvHeaders = fields.join(',');
      
      const csvRows = queryResult.rows.map(row => 
        fields.map(fieldName => {
          const val = row[fieldName];
          const cell = val !== null && val !== undefined ? val.toString() : 'NULL';
          if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      );

      const csvContent = [csvHeaders, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `northwind_query_${Date.now()}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  const handleStreamRequest = (promptText) => {
    if (isStreaming) return;
    setIsStreaming(true);

    const userMessageId = Date.now().toString();
    const botMessageId = (Date.now() + 1).toString();

    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: promptText
    };

    const botMessage = {
      id: botMessageId,
      role: 'assistant',
      status: 'thinking',
      thinking: 'Connecting to translation model...',
      sql: '',
      explanation: '',
      content: '',
      error: null,
      queryResult: null
    };

    const updatedMessages = [...messages, userMessage, botMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);

    // Spawn SSE connection passing selected model parameter
    const streamUrl = api.getChatStreamUrl(promptText, selectedModel);
    const eventSource = new EventSource(streamUrl);

    let currentSql = '';
    let currentExplanation = '';
    let currentThinking = '';

    eventSource.addEventListener('thinking', (e) => {
      try {
        currentThinking = JSON.parse(e.data);
        setMessages(prev => {
          const updated = prev.map(m => m.id === botMessageId ? {
            ...m,
            status: 'thinking',
            thinking: currentThinking
          } : m);
          saveMessages(updated);
          return updated;
        });
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('sql_start', () => {
      setMessages(prev => {
        const updated = prev.map(m => m.id === botMessageId ? {
          ...m,
          status: 'generating'
        } : m);
        saveMessages(updated);
        return updated;
      });
    });

    eventSource.addEventListener('sql_token', (e) => {
      try {
        const token = JSON.parse(e.data);
        currentSql += token;
        setMessages(prev => {
          const updated = prev.map(m => m.id === botMessageId ? {
            ...m,
            sql: currentSql
          } : m);
          saveMessages(updated);
          return updated;
        });
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('explanation_start', () => {
      setMessages(prev => {
        const updated = prev.map(m => m.id === botMessageId ? {
          ...m,
          status: 'explaining'
        } : m);
        saveMessages(updated);
        return updated;
      });
    });

    eventSource.addEventListener('explanation_token', (e) => {
      try {
        const token = JSON.parse(e.data);
        currentExplanation += token;
        setMessages(prev => {
          const updated = prev.map(m => m.id === botMessageId ? {
            ...m,
            explanation: currentExplanation,
            content: currentExplanation
          } : m);
          saveMessages(updated);
          return updated;
        });
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('complete', async (e) => {
      eventSource.close();
      setIsStreaming(false);
      
      try {
        const payload = JSON.parse(e.data);
        const finalSql = payload.sql;
        const queryId = payload.queryId;
        
        setMessages(prev => {
          const updated = prev.map(m => m.id === botMessageId ? {
            ...m,
            status: 'executing',
            sql: finalSql
          } : m);
          saveMessages(updated);
          return updated;
        });

        // Query execution call
        const dbResult = await api.executeChatQuery(queryId);

        setMessages(prev => {
          const updated = prev.map(m => m.id === botMessageId ? {
            ...m,
            status: 'complete',
            queryResult: dbResult
          } : m);
          saveMessages(updated);
          return updated;
        });

      } catch (err) {
        console.error('[Chat] Execution error:', err);
        setMessages(prev => {
          const updated = prev.map(m => m.id === botMessageId ? {
            ...m,
            status: 'error',
            error: err.message || 'Database block error.'
          } : m);
          saveMessages(updated);
          return updated;
        });
      }
    });

    eventSource.addEventListener('error', (e) => {
      console.error('[SSE] Disconnected:', e);
      eventSource.close();
      setIsStreaming(false);
      setMessages(prev => {
        const updated = prev.map(m => m.id === botMessageId ? {
          ...m,
          status: 'error',
          error: 'Local LM Studio connection lost.'
        } : m);
        saveMessages(updated);
        return updated;
      });
    });

    eventSource.addEventListener('done', () => {
      eventSource.close();
      setIsStreaming(false);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    const text = inputValue.trim();
    setInputValue('');
    handleStreamRequest(text);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col border border-border bg-card-bg rounded-lg overflow-hidden animate-fadeIn shadow-sm">
      {/* Header bar controls: Model picker & Wiping history */}
      <div className="border-b border-border bg-muted/10 px-6 py-2.5 flex flex-wrap gap-3 items-center justify-between">
        
        {/* Model dropdown selection */}
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-mono font-medium text-muted-foreground">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isStreaming}
            className="rounded border border-border bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer shadow-sm disabled:opacity-40"
          >
            <option value="auto">Auto (LM Studio Loaded)</option>
            {models.map(mId => (
              <option key={mId} value={mId}>{mId}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleClearChat}
          disabled={messages.length <= 1 || isStreaming}
          className="flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1 text-[10px] font-mono text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer disabled:opacity-20 transition-all shadow-sm"
          title="Clear all stored logs"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear History
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/50">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex gap-4 max-w-4xl ${
              message.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border text-xs font-mono font-semibold relative ${
              message.role === 'user' 
                ? 'bg-zinc-100 border-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300' 
                : 'bg-zinc-950 border-border text-foreground'
            }`}>
              {message.role === 'user' ? 'U' : 'AI'}
            </div>

            {/* Bubble */}
            <div className="space-y-3 flex-1 overflow-hidden">
              
              {/* Optional "Previous Session" label for historical items */}
              {message.isHistorical && message.role === 'assistant' && (
                <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground uppercase tracking-wider bg-muted/60 border border-border/80 rounded px-1.5 py-0.5 w-max">
                  <Archive className="h-2.5 w-2.5" /> Previous Session
                </div>
              )}

              <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed relative ${
                message.role === 'user'
                  ? message.isHistorical
                    ? 'bg-muted/40 border-dashed border-border text-muted-foreground'
                    : 'bg-muted/80 border-border text-foreground'
                  : message.isHistorical
                    ? 'bg-card-bg/50 border-dashed border-border text-muted-foreground'
                    : 'bg-card-bg border-border text-foreground shadow-sm'
              }`}>
                {message.content || message.explanation || (message.status === 'thinking' ? 'Translating prompt...' : '')}
                
                {/* Transformed SQL block */}
                {message.sql && (
                  <div className={`mt-3 rounded border p-3 font-mono text-xs relative group overflow-hidden ${
                    message.isHistorical 
                      ? 'border-dashed border-border bg-zinc-50/20 dark:bg-zinc-950/10'
                      : 'border-border bg-zinc-50 dark:bg-zinc-950/40'
                  }`}>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between font-mono">
                      <span className="flex items-center gap-1.5"><Terminal className="h-3 w-3" /> Transformed SQL Statement</span>
                      
                      <button
                        onClick={() => handleCopySql(message.sql, message.id)}
                        className="rounded border border-border bg-background p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors shadow-sm"
                        title="Copy code"
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap leading-normal font-mono select-all text-zinc-800 dark:text-zinc-200">
                      {message.sql}
                    </pre>
                  </div>
                )}

                {/* Status indicator logs */}
                {message.status === 'thinking' && (
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground animate-pulse mt-2.5 bg-muted/40 rounded border border-border p-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{message.thinking}</span>
                  </div>
                )}

                {message.status === 'executing' && (
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-500 animate-pulse mt-2.5 bg-amber-500/5 rounded border border-amber-500/10 p-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Executing stashed query token...</span>
                  </div>
                )}

                {message.error && (
                  <div className="flex items-start gap-2 text-xs font-mono text-rose-500 mt-2.5 bg-rose-500/5 rounded border border-rose-500/20 p-2.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold block uppercase text-[9px] tracking-wider mb-0.5">Execution Blocked</span>
                      <span className="font-mono">{message.error}</span>
                    </div>
                  </div>
                )}

                {/* Result table data viewer */}
                {message.queryResult && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase border-b border-border pb-1">
                      <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Result rows ({message.queryResult.rowCount})</span>
                      
                      <div className="flex items-center gap-3">
                        <span>Latency: {message.queryResult.executionTimeMs}ms</span>
                        
                        <button
                          onClick={() => handleExportCSV(message.queryResult)}
                          className="flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-mono text-foreground hover:bg-accent cursor-pointer transition-colors shadow-sm"
                          title="Download results as CSV"
                        >
                          <Download className="h-2.5 w-2.5" /> CSV
                        </button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded border border-border bg-card-bg max-h-72 max-w-full">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 sticky top-0 text-muted-foreground">
                            {message.queryResult.fields.map((f, i) => (
                              <th key={i} className="px-3 py-2 font-medium bg-muted/60">{f.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                          {message.queryResult.rows && message.queryResult.rows.length > 0 ? (
                            message.queryResult.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-accent/40">
                                {message.queryResult.fields.map((f, fIdx) => (
                                  <td key={fIdx} className="px-3 py-1.5 whitespace-nowrap">
                                    {row[f.name] !== null && row[f.name] !== undefined ? row[f.name].toString() : 'NULL'}
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={message.queryResult.fields.length} className="px-3 py-4 text-center text-muted-foreground">
                                Empty set returned.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* suggestions */}
              {message.suggestions && !isStreaming && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-left rounded-md border border-border px-3 py-2 text-xs font-mono text-muted-foreground bg-card-bg hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                    >
                      &gt; {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input controls */}
      <div className="border-t border-border p-4 bg-muted/20">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isStreaming}
            placeholder={isStreaming ? "AI is processing query stream..." : "Ask a database question in plain text..."}
            className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono disabled:opacity-50 shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isStreaming}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 cursor-pointer transition-colors disabled:opacity-20 disabled:hover:opacity-20"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>Ask SQL query structure or click suggestion pills above.</span>
          <span className="flex items-center gap-1 uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-zinc-400 animate-pulse" /> Read-Only Transaction Guard
          </span>
        </div>
      </div>
    </div>
  );
}
