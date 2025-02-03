"use client"

import { useState, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChatMessage } from "./chat-message"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [finalScript, setFinalScript] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: "user" as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: messages.length === 0 ? [userMessage] : [...messages, userMessage]
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const data = await response.json()
      const aiResponse = { role: "assistant" as const, content: data.response }
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error("Error in chat:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get AI response. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAndProceed = async () => {
    if (!finalScript.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a final script before proceeding",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalScript }),
      })

      if (!response.ok) {
        throw new Error("Failed to save project")
      }

      const project = await response.json()
      window.location.href = `/create?id=${project.id}`
    } catch (error) {
      console.error("Error saving project:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save project. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex-1 overflow-auto space-y-4 min-h-[300px] border rounded-lg p-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground p-4">
            <h3 className="font-semibold mb-2">Welcome to the Story Development Chat!</h3>
            <p>I'm your story-writing mentor. I'll help you craft and refine your story by asking about:</p>
            <ul className="list-disc list-inside mt-2 text-left max-w-md mx-auto">
              <li>Genre and tone preferences</li>
              <li>Characters and setting</li>
              <li>Plot elements and themes</li>
              <li>Story length and pacing</li>
            </ul>
            <p className="mt-2">Start by telling me what kind of story you'd like to create!</p>
          </div>
        ) : (
          messages.map((message, i) => (
            message.role !== "system" && <ChatMessage key={i} {...message} />
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
          className="min-h-[100px] resize-none"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Sending..." : "Send Message"}
        </Button>
      </form>

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold">Final Script</h3>
        <Textarea
          value={finalScript}
          onChange={(e) => setFinalScript(e.target.value)}
          placeholder="Once you're satisfied with the story, paste your final script here..."
          className="min-h-[200px]"
        />
        <Button 
          onClick={handleSaveAndProceed}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? "Saving..." : "Save & Proceed"}
        </Button>
      </Card>
    </div>
  )
} 