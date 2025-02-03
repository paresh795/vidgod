import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { projectId, script, audioDuration } = await req.json();

    if (!projectId || !script || !audioDuration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate number of segments needed (5-7 seconds per segment)
    const minSecondsPerSegment = 5;
    const maxSecondsPerSegment = 7;
    const avgSecondsPerSegment = (minSecondsPerSegment + maxSecondsPerSegment) / 2;
    const numberOfSegments = Math.ceil(audioDuration / avgSecondsPerSegment);

    // Prepare prompt for GPT to segment the script
    const prompt = `You are a professional script segmentation expert. I need you to divide the following script into exactly ${numberOfSegments} segments.

Requirements:
1. Each segment should be a coherent scene or moment
2. Maintain narrative flow and context
3. Segments should be roughly equal in length/timing
4. Include a brief scene description for each segment

Format your response as follows (maintain exact JSON structure):
{
  "segments": [
    {
      "segment_number": 1,
      "text": "The actual script segment text",
      "scene_description": "Brief description of the scene",
      "timestamp": "0-5s"
    }
    // ... more segments
  ]
}

Script to segment:
${script}

Remember:
- Create exactly ${numberOfSegments} segments
- Keep segments balanced in length
- Ensure each segment can be visualized
- Calculate timestamps based on ${audioDuration} total seconds`;

    // Get GPT to segment the script
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a script segmentation expert. Always respond with valid JSON that matches the requested format exactly."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4",
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    let segmentationResult;
    try {
      segmentationResult = JSON.parse(response);
      
      // Validate the response structure
      if (!segmentationResult.segments || !Array.isArray(segmentationResult.segments)) {
        throw new Error("Invalid response format from OpenAI");
      }

      // Validate each segment has required fields
      segmentationResult.segments.forEach((segment: any, index: number) => {
        if (!segment.segment_number || !segment.text || !segment.scene_description) {
          throw new Error(`Invalid segment data at index ${index}`);
        }
        
        // Calculate precise timestamp based on segment position
        const segmentDuration = audioDuration / numberOfSegments;
        const startTime = Math.round(index * segmentDuration);
        const endTime = Math.round((index + 1) * segmentDuration);
        segment.timestamp = `${startTime}-${endTime}s`;
      });
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      throw new Error("Failed to parse segmentation result");
    }

    // Save segments to database
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        slots: {
          deleteMany: {}, // Clear existing slots
          create: segmentationResult.segments.map((segment: any, index: number) => ({
            index: segment.segment_number - 1,
            textSegment: segment.text,
            sceneDescription: segment.scene_description,
            timestamp: segment.timestamp,
          })),
        },
      },
      include: {
        slots: true,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error in segment creation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create segments" },
      { status: 500 }
    );
  }
} 