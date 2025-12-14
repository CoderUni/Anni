"use client";

import React from "react";
import { ChatRequestOptions } from "ai";
import { useChat } from "ai/react";
import { toast } from "sonner";
import useLocalStorageState from "use-local-storage-state";
import { v4 as uuidv4 } from "uuid";
import { ChatLayout } from "@/components/chat/chat-layout";
import { ChatOptions } from "@/components/chat/chat-options";
import { basePath } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation"; // Import useRouter

const DEFAULT_SYSTEM_PROMPT = process.env.NEXT_PUBLIC_SYSTEM_PROMPT || "You are a helpful assistant.";

interface ChatPageProps {
  chatId: string;
  setChatId: React.Dispatch<React.SetStateAction<string>>;
}

export default function ChatPage({ chatId, setChatId }: ChatPageProps) {
  const router = useRouter(); // Initialize router
  const pathname = usePathname();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    setMessages,
  } = useChat({
    api: basePath + "/api/chat",
    experimental_throttle: 50,
    onError: (error) => {
      toast.error("Something went wrong: " + error);
    },
    onFinish: (message) => {
    }
  });

  const [chatOptions, setChatOptions] = useLocalStorageState<ChatOptions>(
    "chatOptions",
    {
      defaultValue: {
        selectedModel: "",
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        temperature: 0.6,
        topP: 0.95,
        topK: 20,
        minP: 0.0,
        includeThinking: true,
      },
    }
  );

  React.useEffect(() => {
    // Only load from storage if we are navigating to an EXISTING chat ID
    // and we aren't currently generating (to avoid overwriting stream state)
    if (chatId) {
      const item = localStorage.getItem(`chat_${chatId}`);
      if (item) {
        setMessages(JSON.parse(item));
      }
    } else {
      setMessages([]);
    }
  }, [chatId, setMessages]);

  React.useEffect(() => {
    // Save messages to local storage whenever they change
    if (chatId && messages.length > 0) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
      // Trigger storage event so Sidebar updates immediately
      window.dispatchEvent(new Event("storage"));
    }
  }, [messages, chatId]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let currentChatId = chatId;
    if (!currentChatId) {
      currentChatId = uuidv4();
      setChatId(currentChatId);
      window.history.replaceState(null, "", `/chats/${currentChatId}`);
    }

    const requestOptions: ChatRequestOptions = {
      options: {
        body: {
          chatOptions: chatOptions,
        },
      },
    };

    handleSubmit(e, requestOptions);
  };

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center ">
      <ChatLayout
        chatId={chatId}
        setChatId={setChatId}
        chatOptions={chatOptions}
        setChatOptions={setChatOptions}
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={onSubmit}
        isLoading={isLoading}
        error={error}
        stop={stop}
        navCollapsedSize={10}
        defaultLayout={[30, 160]}
      />
    </main>
  );
}