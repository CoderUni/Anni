import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Logo from "../../../public/logo.png"; 
import { Message } from "ai";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";
import ChatMessage from "./chat-message"; // Import the new component

interface ChatListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function ChatList({ messages, isLoading }: ChatListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setIsAtBottom(true);
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const offset = 100; 
    const isBottom = scrollHeight - scrollTop - clientHeight < offset;

    setIsAtBottom(isBottom);
    setShowScrollButton(!isBottom);
  };

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Auto-scroll if we are already at the bottom OR if the last message is from the user
      if (isAtBottom || lastMessage.role === "user") {
        bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      }
    }
  }, [messages, isAtBottom]);

  if (messages.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center p-4">
        <div className="flex flex-col gap-4 items-center opacity-40">
          <Image
            src={Logo}
            alt="AI"
            width={60}
            height={60}
            className="h-16 w-16 object-contain"
          />
          <p className="text-center text-lg text-muted-foreground font-medium">
            How can I help you today?
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        id="scroller"
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth"
      >
        <div className="flex-1 py-6 w-full max-w-3xl mx-auto px-4 flex flex-col gap-6">
          {messages
            .filter((message) => message.role !== "system")
            .map((message, index) => {
              // We pass "isLast" so the component knows if it should be watching for updates
              const isLastMessage = index === messages.length - 1;
              
              return (
                <ChatMessage
                  key={index} // Ideally use message.id if available, but index works for simple lists
                  message={message}
                  isLast={isLastMessage}
                  isLoading={isLoading}
                />
              );
            })}
        </div>
        <div id="anchor" ref={bottomRef} className="h-1"></div>
      </div>

      {showScrollButton && (
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "absolute bottom-4 right-1/2 translate-x-1/2 rounded-full shadow-lg z-50 w-10 h-10 animate-in fade-in zoom-in duration-300",
            "!bg-blue-600 hover:!bg-blue-700 !text-white !border-0"
          )}
          onClick={scrollToBottom}
        >
          <ArrowDownIcon className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}