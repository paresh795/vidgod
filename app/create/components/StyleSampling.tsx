"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StyleSamplingProps {
  projectId: string;
  onStyleApproved: (stylePrompt: string, aspectRatio: string) => void;
  initialSegment?: {
    textSegment: string;
    sceneDescription: string;
  };
  initialStyle?: {
    stylePrompt: string;
    aspectRatio: string;
    previewUrl: string;
  };
}

export function StyleSampling({
  projectId,
  onStyleApproved,
  initialSegment,
  initialStyle,
}: StyleSamplingProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [stylePrompt, setStylePrompt] = useState(initialStyle?.stylePrompt || "");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(initialStyle?.aspectRatio || "16:9");
  const [previewImage, setPreviewImage] = useState<string | null>(initialStyle?.previewUrl || null);
  const [isApproved, setIsApproved] = useState(!!initialStyle?.stylePrompt);
  const { toast } = useToast();

  const aspectRatios = [
    { value: "1:1", label: "Square (1:1)" },
    { value: "16:9", label: "Landscape (16:9)" },
    { value: "9:16", label: "Portrait (9:16)" },
  ];

  const generateSampleImage = async () => {
    if (!stylePrompt) {
      toast({
        title: "Error",
        description: "Please enter a style prompt",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/images/sample", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          stylePrompt,
          aspectRatio: selectedAspectRatio,
          segmentText: initialSegment?.textSegment,
          sceneDescription: initialSegment?.sceneDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate sample image");
      }

      setPreviewImage(data.imageUrl);

      // Save the preview image URL to the project
      const updateResponse = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stylePreviewUrl: data.imageUrl,
        }),
      });

      if (!updateResponse.ok) {
        console.warn("Failed to save preview image URL");
      }

      toast({
        title: "Success",
        description: "Sample image generated successfully",
      });
    } catch (error) {
      console.error("Error generating sample:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate sample image",
        variant: "destructive",
      });
      // Clear the preview image if generation failed
      setPreviewImage(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveStyle = async () => {
    if (!stylePrompt || !previewImage) {
      toast({
        title: "Error",
        description: "Please generate a sample image first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stylePrompt,
          aspectRatio: selectedAspectRatio,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save style");
      }

      setIsApproved(true);
      onStyleApproved(stylePrompt, selectedAspectRatio);
      toast({
        title: "Success",
        description: "Style approved and saved! You can now proceed to generate images for all segments.",
      });
    } catch (error) {
      console.error("Error saving style:", error);
      toast({
        title: "Error",
        description: "Failed to save style",
        variant: "destructive",
      });
    }
  };

  const handlePromptChange = (newPrompt: string) => {
    setStylePrompt(newPrompt);
    // Reset approval when prompt changes
    setIsApproved(false);
  };

  const handleAspectRatioChange = (newRatio: string) => {
    setSelectedAspectRatio(newRatio);
    // Reset preview and approval when ratio changes
    setPreviewImage(null);
    setIsApproved(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="style-prompt">Style Prompt</Label>
          <Textarea
            id="style-prompt"
            placeholder="Describe the visual style you want (e.g., 'cinematic, moody, dark color palette, dramatic lighting')"
            value={stylePrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            className="h-24"
          />
          <p className="text-sm text-muted-foreground">
            Tip: Be specific about the visual style, lighting, mood, and any artistic influences.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
          <Select
            value={selectedAspectRatio}
            onValueChange={handleAspectRatioChange}
          >
            <SelectTrigger id="aspect-ratio">
              <SelectValue placeholder="Select aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              {aspectRatios.map((ratio) => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            This aspect ratio will be used for all images in your project.
          </p>
        </div>

        {initialSegment && (
          <Card className="bg-muted">
            <CardHeader>
              <CardTitle>Sample Scene Context</CardTitle>
              <CardDescription>
                Using this scene to test the style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <h4 className="font-medium">Scene Description</h4>
                <p className="text-sm text-muted-foreground">
                  {initialSegment.sceneDescription}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Script</h4>
                <p className="text-sm text-muted-foreground">
                  {initialSegment.textSegment}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button
            onClick={generateSampleImage}
            disabled={isGenerating || !stylePrompt || isApproved}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">⭮</span>
                Generating...
              </>
            ) : previewImage ? (
              "Regenerate Sample"
            ) : (
              "Generate Sample"
            )}
          </Button>
          <Button
            onClick={handleApproveStyle}
            disabled={!previewImage || isGenerating || isApproved}
            variant={isApproved ? "secondary" : "default"}
            className="flex-1"
          >
            {isApproved ? "Style Approved ✓" : "Approve Style"}
          </Button>
        </div>
      </div>

      {previewImage && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {isApproved ? (
                "Approved sample image with your style"
              ) : (
                "Generated sample image with your style. If you're not satisfied, you can adjust the prompt and regenerate."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`relative overflow-hidden rounded-lg ${
              selectedAspectRatio === "16:9" ? "aspect-video" :
              selectedAspectRatio === "9:16" ? "aspect-[9/16]" :
              "aspect-square"
            }`}>
              <img
                src={previewImage}
                alt="Style sample"
                className="object-cover w-full h-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isApproved && (
        <Card className="bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300">Style Approved</CardTitle>
            <CardDescription>
              Your style has been saved. You can now proceed to the Images tab to generate images for all segments.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
} 