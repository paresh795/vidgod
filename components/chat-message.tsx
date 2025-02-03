"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ChatMessageProps {
  role: "user" | "assistant" | "system"
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === "system") return null

  return (
    <div
      className={cn(
        "flex w-full gap-2 p-4",
        role === "user" ? "bg-muted/50" : "bg-background"
      )}
    >
      <Avatar className="h-8 w-8 bg-primary">
        <AvatarFallback className="bg-primary text-primary-foreground">
          {role === "user" ? "U" : "AI"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="prose break-words">
          {content}
        </div>
      </div>
    </div>
  )
} 