"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, RotateCcw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAskLibrary } from "@/hooks/useAskLibrary";
import { cn } from "@/lib/utils";

const EXAMPLE_QUESTIONS = [
  "How does UMA's oracle work?",
  "What is LMSR and how does it price trades?",
  "Why do prediction markets need liquidity?",
  "What's the difference between Polymarket and Kalshi?",
  "What are the arguments for insider trading in prediction markets?",
];

export function AskContent() {
  const { messages, isStreaming, error, remainingQuestions, ask, reset } = useAskLibrary();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    ask(input.trim());
    setInput("");
  }

  function handleExampleClick(question: string) {
    if (isStreaming) return;
    ask(question);
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-background">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          {!hasMessages ? (
            /* Welcome state */
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-semibold text-foreground text-center mb-2">
                Ask the Library
              </h1>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                Ask questions about prediction markets and get answers synthesized from our curated library of 100+ articles, with citations.
              </p>
              <div className="w-full max-w-md space-y-2">
                <p className="text-xs text-muted-foreground/60 text-center mb-2">
                  Try asking:
                </p>
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleExampleClick(q)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm",
                      "border border-border/50 bg-card",
                      "text-foreground/80 hover:text-foreground hover:border-border hover:bg-accent/30",
                      "transition-colors"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={cn(msg.role === "user" ? "flex justify-end" : "")}>
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-primary text-primary-foreground text-sm">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || (isStreaming && i === messages.length - 1 ? "..." : "")}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border/50 bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {hasMessages && (
              <button
                type="button"
                onClick={reset}
                className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                title="New conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about prediction markets..."
                maxLength={300}
                disabled={isStreaming}
                className={cn(
                  "w-full h-10 pl-3.5 pr-10 rounded-lg text-sm",
                  "bg-accent/30 border border-border/50",
                  "placeholder:text-muted-foreground/50",
                  "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30",
                  "disabled:opacity-50 transition-colors"
                )}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <p className="text-[11px] text-muted-foreground/40">
              Answers are AI-generated from our curated library. Always verify with the cited sources.
            </p>
            {remainingQuestions !== null && (
              <p className="text-[11px] text-muted-foreground/40 shrink-0 ml-2">
                {remainingQuestions} questions left today
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
