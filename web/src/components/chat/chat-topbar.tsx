"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  HamburgerMenuIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { Message } from "ai/react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { encodeChat, getTokenLimit } from "@/lib/token-counter";
import { basePath, useHasMounted } from "@/lib/utils";
import { Sidebar } from "../sidebar";
import { ChatOptions } from "./chat-options";

interface ChatTopbarProps {
  chatOptions: ChatOptions;
  setChatOptions: React.Dispatch<React.SetStateAction<ChatOptions>>;
  isLoading: boolean;
  chatId?: string;
  setChatId: React.Dispatch<React.SetStateAction<string>>;
  messages: Message[];
}

export default function ChatTopbar({
  chatOptions,
  setChatOptions,
  isLoading,
  chatId,
  setChatId,
  messages,
}: ChatTopbarProps) {
  const hasMounted = useHasMounted();
  const currentModel = chatOptions && chatOptions.selectedModel;
  const [tokenLimit, setTokenLimit] = React.useState<number>(4096);
  
  const [serverStatus, setServerStatus] = useState<"connecting" | "connected" | "error">("connecting");

  const checkServerConnection = async () => {
    if (!hasMounted) return;
    
    setServerStatus("connecting");
    
    try {
      const res = await fetch(basePath + "/api/models");

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      
      setServerStatus("connected");

      if (!currentModel && data.data && data.data.length > 0) {
        const modelNames = data.data.map((model: any) => model.id);
        setChatOptions({ ...chatOptions, selectedModel: modelNames[0] });
      }
    } catch (error) {
      console.error("Connection failed:", error);
      setServerStatus("error");
    }
  };

  useEffect(() => {
    checkServerConnection();
    getTokenLimit(basePath).then((limit) => setTokenLimit(limit));
  }, [hasMounted]);

  if (!hasMounted) return null;

  return (
    <div className="w-full flex px-4 py-4 items-center justify-between bg-background border-b z-10">
      <Sheet>
        <SheetTrigger>
          <div className="flex items-center gap-2 hover:bg-accent p-2 rounded-md transition-colors">
            <HamburgerMenuIcon className="md:hidden w-5 h-5" />
          </div>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <Sidebar
            chatId={chatId || ""}
            setChatId={setChatId}
            isCollapsed={false}
            isMobile={true}
            chatOptions={chatOptions}
            setChatOptions={setChatOptions}
          />
        </SheetContent>
      </Sheet>

      <div className="flex items-center justify-center flex-1">
        {/* SERVER STATUS INDICATOR */}
        <div className="flex items-center gap-2 cursor-default select-none">
          
          {serverStatus === "connecting" && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border">
              <ReloadIcon className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Connecting...</span>
            </div>
          )}

          {serverStatus === "connected" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 cursor-help">
                    <CheckCircledIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Ready</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Connected to vLLM</p>
                  <p className="opacity-70 text-[10px] uppercase tracking-wide">Model: {currentModel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {serverStatus === "error" && (
            <div 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-500/20 transition-colors"
              onClick={() => checkServerConnection()}
              title="Click to retry connection"
            >
              <CrossCircledIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Server Offline</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end w-10">
        {/* Spinner for generation active state */}
        {isLoading && serverStatus === "connected" && (
           <ReloadIcon className="w-4 h-4 text-blue-500 animate-spin" />
        )}
      </div>
    </div>
  );
}