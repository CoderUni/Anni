"use client";

import React, { useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Message } from "ai";
import { cn } from "@/lib/utils";
import CodeDisplayBlock from "../code-display-block";
import ThinkBlock from "./think-block";
import "katex/dist/katex.min.css";

const parseMessageContent = (content: string) => {
  let thinkMatch = /<think>([\s\S]*?)(?:<\/think>|$)/i.exec(content);
  if (!thinkMatch && content.includes("</think>")) {
    thinkMatch = /^([\s\S]*?)(?:<\/think>)/i.exec(content);
  }

  let thinkContent = null;
  let mainContent = content;

  if (thinkMatch) {
    thinkContent = thinkMatch[1].trim();
    mainContent = content.replace(thinkMatch[0], "").trim();
    mainContent = mainContent.replace(/<\/think>/gi, "").trim();
  }

  return { thinkContent, mainContent };
};

interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  isLoading: boolean;
}

const ChatMessage = React.memo(
  ({ message, isLast, isLoading }: ChatMessageProps) => {
    const isUser = message.role === "user";
    
    const { thinkContent, mainContent } = useMemo(
      () => parseMessageContent(message.content),
      [message.content]
    );

    const isThinkingLive =
      isLoading &&
      isLast &&
      (message.content.includes("<think>") || !message.content.includes("</think>")) &&
      !message.content.includes("</think>");

    return (
      <div
        className={cn(
          "flex w-full",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            isUser ? "items-end max-w-[85%] md:max-w-[75%] min-w-0" : "w-full items-start min-w-0"
          )}
        >
          <div
            className={cn(
              "relative text-[15px] leading-relaxed max-w-full",
              isUser
                ? "px-5 py-3 rounded-2xl rounded-tr-sm bg-blue-600 text-white dark:bg-zinc-800 dark:text-foreground shadow-sm whitespace-pre-wrap break-words break-all"
                : "w-full px-0 py-0"
            )}
          >
            {!isUser && thinkContent && (
              <ThinkBlock content={thinkContent} isLive={isThinkingLive} />
            )}

            <div className={cn(!isUser && thinkContent && "mt-4", "overflow-hidden")}>
              <Markdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const lang = match ? match[1] : "";
                    return !inline && match ? (
                      <div className="my-6 rounded-md overflow-hidden border border-border">
                        <CodeDisplayBlock
                          code={String(children).replace(/\n$/, "")}
                          lang={lang}
                        />
                      </div>
                    ) : (
                      <code
                        className={cn(
                          "px-1.5 py-0.5 rounded-md font-mono text-[13px] border break-all",
                          isUser
                            ? "bg-white/20 text-white border-transparent"
                            : "bg-muted text-foreground border-border"
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mt-8 mb-4 break-words break-all">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mt-8 mb-4 border-b pb-2 break-words break-all">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-6 mb-3 break-words break-all">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-semibold mt-6 mb-3 break-words break-all">{children}</h4>
                  ),
                  p: ({ children }) => (
                    <p className="mb-5 last:mb-0 leading-7 whitespace-pre-wrap break-words break-all">{children}</p>
                  ),
                  a: ({ children, ...props }: any) => (
                    <a className="text-blue-500 hover:underline cursor-pointer font-medium break-all" {...props}>
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-5 space-y-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-5 space-y-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="pl-1 leading-7">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/20 bg-muted/40 pl-4 py-2 my-4 rounded-r-md italic">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6 border rounded-md">
                      <table className="w-full text-sm text-left">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="bg-muted px-4 py-3 border-b font-semibold">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 border-b last:border-0">{children}</td>
                  ),
                }}
              >
                {isUser ? message.content : mainContent}
              </Markdown>
            </div>

            {isLoading && isLast && !isUser && !isThinkingLive && mainContent.length === 0 && (
                <div className="flex items-center gap-1 h-6 mt-2 opacity-50">
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce"></span>
                </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    const isHistory = !prevProps.isLast && !nextProps.isLast;
    if (isHistory) return true;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    return prevProps.message.content === nextProps.message.content;
  }
);

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;