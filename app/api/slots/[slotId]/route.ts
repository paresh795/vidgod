import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { slotId: string } }
) {
  try {
    const { imagePrompt, imageUrl } = await req.json();
    const { slotId } = params;

    // Prepare update data based on what was provided
    const updateData: any = {};
    if (imagePrompt !== undefined) updateData.imagePrompt = imagePrompt;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updatedSlot = await prisma.slot.update({
      where: { id: slotId },
      data: updateData
    });

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error("Error updating slot:", error);
    return NextResponse.json(
      { error: "Failed to update slot" },
      { status: 500 }
    );
  }
} 