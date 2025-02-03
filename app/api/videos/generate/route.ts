import { NextResponse } from "next/server";
import Replicate from "replicate";
import prisma from "@/app/lib/prisma";

const replicate = new Replicate();

const MODEL = "minimax/video-01";

export async function POST(req: Request) {
  try {
    const { slotId, prompt, imageUrl } = await req.json();

    if (!slotId || !prompt || !imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update slot status to PROCESSING
    await prisma.$executeRaw`
      UPDATE "Slot"
      SET "videoStatus" = 'PROCESSING',
          "videoPrompt" = ${prompt}
      WHERE "id" = ${slotId}
    `;

    // Start video generation with minimax/video-01 model
    const prediction = await replicate.predictions.create({
      model: MODEL,
      input: {
        prompt: prompt,
        first_frame_image: imageUrl,
        prompt_optimizer: true  // Enable prompt optimization for better results
      }
    });

    // Return the prediction ID for status checking
    return NextResponse.json({ 
      predictionId: prediction.id,
      status: prediction.status 
    });
  } catch (error) {
    console.error("Error in video generation:", error);
    return NextResponse.json(
      { error: "Failed to start video generation" },
      { status: 500 }
    );
  }
} 