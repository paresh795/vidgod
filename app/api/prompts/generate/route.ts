import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { PromptGenerationResponse, GeneratedPrompt, VisualContinuity } from "@/lib/types";

interface RequestSlot {
  id: string;
  index: number;
  textSegment: string | null;
  sceneDescription: string | null;
  timestamp: string | null;
}

interface SlotUpdate {
  imagePrompt: string;
  continuityMetadata: string;
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PROMPT_ENGINEER_SYSTEM_PROMPT = `You are a master cinematographer and visual storyteller. Your task is to create detailed, standalone scene descriptions for EVERY segment in the story. You must generate exactly one prompt for each segment provided, maintaining the same order.

CRITICAL REQUIREMENTS:
1. Generate EXACTLY one prompt for EACH segment in the input
2. Each prompt must be completely self-contained
3. Never use pronouns without clear antecedents
4. Always introduce subjects and settings as if for the first time
5. Include complete visual context in every scene

SCENE DESCRIPTION STRUCTURE:
1. COMPLETE SETTING ESTABLISHMENT
   - Time of day, weather, location
   - Full environmental context
   - Atmosphere and mood

2. SUBJECT INTRODUCTION
   - Introduce every subject as if for the first time
   - Include all identifying characteristics
   - Describe their current state and actions

3. VISUAL DETAILS
   - Lighting conditions
   - Camera angle and framing
   - Color palette and tone
   - Textures and materials
   - Depth and perspective

4. TECHNICAL SPECIFICATIONS
   - Composition guidelines for the specified aspect ratio
   - Key focal points
   - Depth of field

BAD EXAMPLE:
"The tiger continues hunting in the snow" (lacks context, uses pronouns without antecedents)

GOOD EXAMPLE:
"A massive Canadian Snow Tiger, its white fur shimmering with subtle black stripes, stalks through a pristine snow-covered pine forest at dawn. The tiger's distinctive features - crystalline blue eyes and powerful, muscular frame - stand out against the misty winter landscape. Golden morning light filters through frost-laden branches, creating a dramatic rim lighting effect on the tiger's fur. Shot from a low angle, the tiger's powerful form dominates the right third of the frame while snow-covered pines recede into the misty distance, creating depth."

OUTPUT FORMAT:
You MUST return a JSON object with this EXACT structure:
{
  "prompts": [
    {
      "sceneIndex": number (matching the input segment's index),
      "prompt": string (the complete scene description),
      "visualContinuity": {
        "elementsToMaintain": string[],
        "elementsToEvolve": string[]
      }
    }
    // EXACTLY one entry for EACH input segment
  ]
}

CRITICAL REMINDERS:
1. You MUST generate EXACTLY one prompt for EACH segment
2. NEVER skip any segments
3. NEVER combine segments
4. NEVER use pronouns without clear antecedents
5. ALWAYS describe the complete setting
6. ALWAYS introduce subjects as if for the first time
7. ALWAYS include full visual context`;

export async function POST(req: Request) {
  try {
    const { projectId, slots, stylePrompt, aspectRatio } = await req.json();
    console.log("Starting prompt generation for", slots.length, "slots");

    if (!projectId || !slots || !stylePrompt || !aspectRatio) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch complete project context
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        slots: {
          orderBy: { index: 'asc' }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Prepare the context for GPT
    const promptRequest = {
      story: {
        fullScript: project.finalScript,
        segments: slots.map((slot: RequestSlot) => ({
          index: slot.index,
          text: slot.textSegment || "",
          description: slot.sceneDescription || "",
          timestamp: slot.timestamp || ""
        }))
      },
      style: {
        desiredStyle: stylePrompt,
        aspectRatio: aspectRatio
      }
    };

    console.log("Making OpenAI request...");
    
    // Generate prompts using GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: PROMPT_ENGINEER_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify(promptRequest)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    console.log("Received OpenAI response");

    if (!completion.choices[0].message.content) {
      throw new Error("No response content from OpenAI");
    }

    // Parse and validate the response
    console.log("Parsing OpenAI response...");
    const response: PromptGenerationResponse = JSON.parse(
      completion.choices[0].message.content
    );
    console.log("Generated", response.prompts?.length || 0, "prompts");

    // Validate that we have prompts for all slots
    if (!response.prompts || response.prompts.length !== slots.length) {
      console.error("Prompt count mismatch:", {
        expectedSlots: slots.length,
        receivedPrompts: response.prompts?.length || 0
      });
      throw new Error(`Expected ${slots.length} prompts but got ${response.prompts?.length || 0}`);
    }

    // Validate each prompt has required fields and matches a slot
    response.prompts.forEach((prompt, index) => {
      if (!prompt.prompt || typeof prompt.prompt !== 'string') {
        throw new Error(`Invalid prompt at index ${index}`);
      }
      if (prompt.sceneIndex < 0 || prompt.sceneIndex >= slots.length) {
        throw new Error(`Invalid scene index ${prompt.sceneIndex} at prompt ${index}`);
      }
      if (!slots[prompt.sceneIndex]) {
        throw new Error(`No matching slot found for scene index ${prompt.sceneIndex}`);
      }
    });

    // Sort prompts by sceneIndex to ensure order matches slots
    response.prompts.sort((a, b) => a.sceneIndex - b.sceneIndex);

    // Prepare the updates
    const updates = response.prompts.map((prompt: GeneratedPrompt) => {
      console.log(`Processing prompt for scene ${prompt.sceneIndex}:`, prompt.prompt.substring(0, 50) + "...");
      const update: SlotUpdate = {
        imagePrompt: prompt.prompt,
        continuityMetadata: JSON.stringify(prompt.visualContinuity)
      };
      return prisma.slot.update({
        where: { 
          id: slots[prompt.sceneIndex].id 
        },
        data: update
      });
    });

    // Execute all updates in a transaction
    console.log("Executing database updates...");
    await prisma.$transaction(updates);
    console.log("Database updates completed");

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating prompts:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompts" },
      { status: 500 }
    );
  }
} 