"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "onprediction-ask-messages";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function loadMessages(): Message[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useAskLibrary() {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(null);

  // Persist messages to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage full or unavailable
    }
  }, [messages]);

  const ask = useCallback(async (question: string) => {
    if (isStreaming) return;

    setError(null);

    // Build conversation history including the new question
    const newMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(newMessages);
    setIsStreaming(true);

    // Get session token if authenticated
    let sessionToken: string | undefined;
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.access_token) {
      sessionToken = sessionData.session.access_token;
    }

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sessionToken, history: newMessages.slice(0, -1) }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining !== null) {
        setRemainingQuestions(parseInt(remaining, 10));
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Request failed" }));
        setError(data.error || "Something went wrong");
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("No response stream");
        setIsStreaming(false);
        return;
      }

      // Add empty assistant message to append to
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "delta" && event.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.text,
                    };
                  }
                  return updated;
                });
              } else if (event.type === "error") {
                setError(event.error);
              }
            } catch {
              // Skip unparseable
            }
          }
        }
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setIsStreaming(false);
  }, [isStreaming, messages]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { messages, isStreaming, error, remainingQuestions, ask, reset };
}
