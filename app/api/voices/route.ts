import { NextResponse } from "next/server"
import { getVoices } from "@/lib/elevenlabs"

export async function GET() {
  try {
    const voices = await getVoices()
    return NextResponse.json(voices)
  } catch (error) {
    console.error("Error in voices endpoint:", error)
    return NextResponse.json(
      { error: "Failed to fetch voices" },
      { status: 500 }
    )
  }
} 