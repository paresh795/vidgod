import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { finalScript } = await request.json()

    if (!finalScript) {
      return NextResponse.json(
        { error: "Final script is required" },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        finalScript,
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
} 