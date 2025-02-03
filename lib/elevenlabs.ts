if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("Missing ELEVENLABS_API_KEY environment variable")
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

interface Voice {
  voice_id: string
  name: string
  preview_url: string
}

export async function getVoices(): Promise<Voice[]> {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch voices")
    }

    const data = await response.json()
    return data.voices
  } catch (error) {
    console.error("Error fetching voices:", error)
    throw new Error("Failed to fetch voices")
  }
}

export async function generateSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error("Failed to generate speech")
    }

    return await response.arrayBuffer()
  } catch (error) {
    console.error("Error generating speech:", error)
    throw new Error("Failed to generate speech")
  }
} 