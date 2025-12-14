import {
  streamText,
  CoreMessage,
  CoreUserMessage,
  CoreSystemMessage,
  CoreAssistantMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { encodeChat } from "@/lib/token-counter";
import { NextResponse } from "next/server";

export const maxDuration = 900;

const addSystemMessage = (messages: CoreMessage[], systemPrompt?: string) => {
  if (!systemPrompt || systemPrompt === "") {
    return messages;
  }
  if (!messages) {
    messages = [{ content: systemPrompt, role: "system" }];
  } else if (messages.length === 0) {
    messages.push({ content: systemPrompt, role: "system" });
  } else {
    if (messages[0].role === "system") {
      messages[0].content = systemPrompt;
    } else {
      messages.unshift({ content: systemPrompt, role: "system" });
    }
  }
  return messages;
};

const handleThinkingTag = (messages: CoreMessage[], includeThinking: boolean) => {
  if (includeThinking) return messages;

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const originalContent = messages[i].content;
      if (typeof originalContent === "string") {
        messages[i].content = `/no_think ${originalContent}`;
      }
      break; 
    }
  }
  return messages;
};

const formatMessages = (
  messages: CoreMessage[],
  tokenLimit: number = 4096
): CoreMessage[] => {
  let mappedMessages: CoreMessage[] = [];
  let messagesTokenCounts: number[] = [];
  const reservedResponseTokens = 512;
  const tokenLimitRemaining = tokenLimit - reservedResponseTokens;
  let tokenCount = 0;

  messages.forEach((m) => {
    if (m.role === "system") {
      mappedMessages.push({ role: "system", content: m.content } as CoreSystemMessage);
    } else if (m.role === "user") {
      mappedMessages.push({ role: "user", content: m.content } as CoreUserMessage);
    } else if (m.role === "assistant") {
      mappedMessages.push({ role: "assistant", content: m.content } as CoreAssistantMessage);
    } else { return; }

    const messageTokens = encodeChat([m]);
    messagesTokenCounts.push(messageTokens);
    tokenCount += messageTokens;
  });

  if (tokenCount <= tokenLimitRemaining) { return mappedMessages; }

  while (tokenCount > tokenLimitRemaining) {
    const middleMessageIndex = Math.floor(messages.length / 2);
    const middleMessageTokens = messagesTokenCounts[middleMessageIndex];
    mappedMessages.splice(middleMessageIndex, 1);
    messagesTokenCounts.splice(middleMessageIndex, 1);
    tokenCount -= middleMessageTokens;
  }
  return mappedMessages;
};

export async function POST(req: Request) {
  try {
    const { messages, chatOptions } = await req.json();
    
    if (!chatOptions.selectedModel) {
      throw new Error("Selected model is required");
    }

    const baseUrl = process.env.NEXT_PUBLIC_VLLM_URL;
    if (!baseUrl) throw new Error("VLLM_URL is not set");
    
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const apiKey = process.env.VLLM_API_KEY;

    const tokenLimit = process.env.NEXT_PUBLIC_VLLM_TOKEN_LIMIT
      ? parseInt(process.env.NEXT_PUBLIC_VLLM_TOKEN_LIMIT)
      : 4096;

    let processedMessages = addSystemMessage(messages, chatOptions.systemPrompt);
    const includeThinking = chatOptions.includeThinking ?? true;
    processedMessages = handleThinkingTag(processedMessages, includeThinking);
    const formattedMessages = formatMessages(processedMessages, tokenLimit);

    const customOpenai = createOpenAI({
      baseURL: cleanBaseUrl + "/v1",
      apiKey: apiKey ?? "EMPTY",
    });

    const result = await streamText({
      model: customOpenai(chatOptions.selectedModel),
      messages: formattedMessages,
      temperature: chatOptions.temperature,
      topP: chatOptions.topP,
      topK: chatOptions.topK,
      ...{ min_p: chatOptions.minP }
    });

    return result.toDataStreamResponse({
        getErrorMessage: (error) => {
            return (error as Error).message;
        }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}