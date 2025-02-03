import { NextResponse } from "next/server"
import { generateSpeech } from "@/lib/elevenlabs"
import { prisma } from "@/lib/db"
import { writeFile } from "fs/promises"
import { join } from "path"
import { mkdir } from "fs/promises"
import { calculateAudioDuration } from "@/lib/audioUtils"

export async function POST(request: Request) {
  try {
    const { text, voiceId, projectId } = await request.json()

    if (!text || !voiceId || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Generate speech using ElevenLabs
    const audioBuffer = await generateSpeech(text, voiceId)

    // Calculate audio duration
    const audioDuration = calculateAudioDuration(audioBuffer)

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadsDir, { recursive: true })

    // Save the audio file
    const filename = `${projectId}-${Date.now()}.mp3`
    const filePath = join(uploadsDir, filename)
    await writeFile(filePath, Buffer.from(audioBuffer))

    // Get the relative path for the audio URL
    const audioUrl = `/uploads/${filename}`

    // Update the project with the audio URL and duration
    await prisma.project.update({
      where: { id: projectId },
      data: {
        ttsAudioUrl: audioUrl,
        audioDuration,
      },
    })

    return NextResponse.json({ audioUrl, audioDuration })
  } catch (error) {
    console.error("Error in TTS endpoint:", error)
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    )
  }
} 