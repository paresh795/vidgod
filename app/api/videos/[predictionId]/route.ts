import { NextResponse } from "next/server";
import Replicate from "replicate";
import prisma from "@/app/lib/prisma";

const replicate = new Replicate();

export async function GET(
  request: Request,
  { params }: { params: { predictionId: string } }
) {
  try {
    const prediction = await replicate.predictions.get(params.predictionId);

    if (prediction.error) {
      return NextResponse.json(
        { error: prediction.error },
        { status: 500 }
      );
    }

    // If the prediction is completed and we have output
    if (prediction.status === "succeeded" && prediction.output) {
      // The output is directly a video URL string in this model
      const videoUrl = prediction.output;
      
      // Find the slot associated with this prediction
      const slot = await prisma.$queryRaw`
        SELECT * FROM "Slot" WHERE "videoStatus" = 'PROCESSING' LIMIT 1
      `;

      const foundSlot = Array.isArray(slot) ? slot[0] : null;

      if (foundSlot) {
        // Update the slot with the video URL
        await prisma.$executeRaw`
          UPDATE "Slot"
          SET "videoUrl" = ${videoUrl},
              "videoStatus" = 'COMPLETED'
          WHERE "id" = ${foundSlot.id}
        `;
      }

      return NextResponse.json({
        status: "succeeded",
        output: videoUrl
      });
    } else if (prediction.status === "failed") {
      // Update slot status if found
      const slot = await prisma.$queryRaw`
        SELECT * FROM "Slot" WHERE "videoStatus" = 'PROCESSING' LIMIT 1
      `;

      const foundSlot = Array.isArray(slot) ? slot[0] : null;

      if (foundSlot) {
        await prisma.$executeRaw`
          UPDATE "Slot"
          SET "videoStatus" = 'FAILED'
          WHERE "id" = ${foundSlot.id}
        `;
      }

      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Video generation failed"
      });
    }

    // If still processing, return the current status
    return NextResponse.json({
      status: prediction.status,
      output: null
    });
  } catch (error) {
    console.error("Error checking prediction status:", error);
    return NextResponse.json(
      { error: "Failed to check prediction status" },
      { status: 500 }
    );
  }
} 