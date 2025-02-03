import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        slots: {
          orderBy: {
            index: "asc",
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { stylePrompt, aspectRatio, stylePreviewUrl } = await request.json()

    const updateData: any = {};
    if (stylePrompt !== undefined) updateData.stylePrompt = stylePrompt;
    if (aspectRatio !== undefined) updateData.aspectRatio = aspectRatio;
    if (stylePreviewUrl !== undefined) updateData.stylePreviewUrl = stylePreviewUrl;

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      include: {
        slots: {
          orderBy: {
            index: "asc",
          },
        },
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    )
  }
} 