import { NextResponse } from "next/server";
import Replicate from "replicate";
import { prisma } from "@/lib/db";

if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error("Missing REPLICATE_API_TOKEN environment variable");
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request) {
  try {
    const { projectId, slotId, stylePrompt, aspectRatio, segmentText, sceneDescription } = await req.json();

    if (!projectId || !slotId || !stylePrompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate aspect ratio against allowed values
    const validAspectRatios = ["1:1", "16:9", "3:2", "2:3", "4:5", "5:4", "9:16", "3:4", "4:3"];
    const validatedAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    // Combine style prompt with scene context
    const fullPrompt = `${sceneDescription}. ${segmentText}. Style: ${stylePrompt}. Aspect ratio ${validatedAspectRatio}, composition optimized for ${validatedAspectRatio === "9:16" ? "vertical" : validatedAspectRatio === "16:9" ? "horizontal" : "square"} format.`;

    console.log("Making Replicate API call for slot", slotId, "with:", {
      prompt: fullPrompt,
      aspect_ratio: validatedAspectRatio
    });

    try {
      // Create prediction using the model directly
      const prediction = await replicate.predictions.create({
        model: "black-forest-labs/flux-1.1-pro",
        input: {
          prompt: fullPrompt,
          aspect_ratio: validatedAspectRatio,
          prompt_upsampling: true,
          num_inference_steps: 50,
          guidance_scale: 7.5,
          negative_prompt: "blurry, low quality, distorted, deformed",
          output_format: "png",
          output_quality: 100
        },
      });

      // Wait for the prediction to complete
      const output = await replicate.wait(prediction);

      // Check if the prediction was successful
      if (output.status === 'succeeded' && output.output) {
        const imageUrl = output.output;

        // Update the slot with the generated image URL using raw SQL
        await prisma.$executeRaw`
          UPDATE Slot 
          SET imageUrl = ${imageUrl}
          WHERE id = ${slotId}
        `;

        return NextResponse.json({ imageUrl });
      } else if (output.error) {
        throw new Error(`Prediction failed: ${output.error}`);
      } else {
        throw new Error('Prediction completed but no output was generated');
      }
    } catch (error) {
      console.error("Replicate API error details:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        details: error && typeof error === 'object' ? error : "No details available"
      });

      if (error && typeof error === 'object' && 'detail' in error) {
        return NextResponse.json(
          { error: `Replicate API error: ${(error as any).detail}` },
          { status: 422 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 }
    );
  }
} 