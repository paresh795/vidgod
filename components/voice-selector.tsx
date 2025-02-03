"use client"

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface Voice {
  voice_id: string
  name: string
  preview_url: string
}

interface VoiceSelectorProps {
  onVoiceSelect: (voiceId: string) => void
  disabled?: boolean
}

export function VoiceSelector({ onVoiceSelect, disabled }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const { toast } = useToast()
  const audioRef = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    async function fetchVoices() {
      try {
        const response = await fetch("/api/voices")
        if (!response.ok) throw new Error("Failed to fetch voices")
        const data = await response.json()
        setVoices(data)
        if (data.length > 0) {
          setSelectedVoice(data[0].voice_id)
          onVoiceSelect(data[0].voice_id)
        }
      } catch (error) {
        console.error("Error fetching voices:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load voices. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchVoices()
  }, [onVoiceSelect, toast])

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId)
    onVoiceSelect(voiceId)
    if (audioRef[0]) {
      audioRef[0].pause()
      setIsPlaying(false)
    }
  }

  const handlePreview = () => {
    const voice = voices.find(v => v.voice_id === selectedVoice)
    if (!voice) return

    if (audioRef[0]) {
      audioRef[0].pause()
    }

    const audio = new Audio(voice.preview_url)
    audioRef[0] = audio

    audio.onplay = () => setIsPlaying(true)
    audio.onpause = () => setIsPlaying(false)
    audio.onended = () => setIsPlaying(false)

    audio.play()
  }

  if (isLoading) {
    return (
      <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
    )
  }

  return (
    <div className="flex gap-2">
      <Select
        value={selectedVoice}
        onValueChange={handleVoiceChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a voice" />
        </SelectTrigger>
        <SelectContent>
          {voices.map((voice) => (
            <SelectItem key={voice.voice_id} value={voice.voice_id}>
              {voice.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        disabled={!selectedVoice || isPlaying}
        onClick={handlePreview}
      >
        {isPlaying ? "▶️" : "🔊"}
      </Button>
    </div>
  )
} 