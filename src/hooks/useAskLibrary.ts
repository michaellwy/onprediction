"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useAskLibrary() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(null);

  const ask = useCallback(async (question: string) => {
    if (isStreaming) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
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
        body: JSON.stringify({ question, sessionToken }),
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
  }, [isStreaming]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, remainingQuestions, ask, reset };
}
