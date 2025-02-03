import { ChatBox } from "@/components/chat-box"

export default function ChatPage() {
  return (
    <main className="container mx-auto min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Story Development Chat</h1>
          <p className="text-muted-foreground">
            Chat with our AI to develop and refine your story. Once you're satisfied,
            save your final script to proceed with narration and visualization.
          </p>
        </div>
        <ChatBox />
      </div>
    </main>
  )
} 