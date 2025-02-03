"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Slot {
  id: string;
  index: number;
  textSegment: string;
  sceneDescription: string;
  timestamp: string;
  imageUrl?: string;
  imagePrompt?: string;
  continuityMetadata?: {
    elementsToMaintain: string[];
    elementsToEvolve: string[];
  };
}

interface BulkImageGenProps {
  projectId: string;
  slots: Slot[];
  stylePrompt: string;
  aspectRatio: string;
  onSlotsUpdate: (slots: Slot[]) => void;
}

export function BulkImageGen({
  projectId,
  slots,
  stylePrompt,
  aspectRatio,
  onSlotsUpdate,
}: BulkImageGenProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [generatedSlots, setGeneratedSlots] = useState<Slot[]>(slots);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    setGeneratedSlots(slots);
  }, [slots]);

  useEffect(() => {
    onSlotsUpdate(generatedSlots);
  }, [generatedSlots, onSlotsUpdate]);

  const generateImageForSlot = async (slot: Slot) => {
    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          slotId: slot.id,
          stylePrompt,
          aspectRatio,
          segmentText: slot.textSegment,
          sceneDescription: slot.imagePrompt || slot.sceneDescription,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate image");
      }

      const data = await response.json();
      
      const updateResponse = await fetch(`/api/slots/${slot.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: data.imageUrl,
          imagePrompt: slot.imagePrompt
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update slot with new image");
      }

      return {
        imageUrl: data.imageUrl,
        lastGeneratedPrompt: slot.imagePrompt
      };
    } catch (error) {
      console.error(`Error generating image for slot ${slot.index}:`, error);
      throw error;
    }
  };

  const generateAllImages = async () => {
    setIsGenerating(true);
    setProgress(0);
    
    try {
      const promptResponse = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          slots: generatedSlots,
          stylePrompt,
          aspectRatio
        })
      });

      if (!promptResponse.ok) {
        throw new Error("Failed to generate prompts");
      }

      const { prompts, metadata } = await promptResponse.json();
      
      const updatedSlots = generatedSlots.map((slot, index) => ({
        ...slot,
        imagePrompt: prompts[index].prompt,
        continuityMetadata: prompts[index].visualContinuity
      }));
      setGeneratedSlots(updatedSlots);

      for (let i = 0; i < updatedSlots.length; i++) {
        setCurrentSlotIndex(i);
        const slot = updatedSlots[i];
        
        try {
          const result = await generateImageForSlot(slot);
          updatedSlots[i] = { 
            ...slot, 
            imageUrl: result.imageUrl
          };
          setGeneratedSlots([...updatedSlots]);
          setProgress(((i + 1) / slots.length) * 100);
        } catch (error) {
          toast({
            title: "Error",
            description: `Failed to generate image for segment ${i + 1}. Continuing with remaining segments.`,
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: "All images generated successfully!",
      });
    } catch (error) {
      console.error("Error in bulk generation:", error);
      toast({
        title: "Error",
        description: "Failed to complete image generation",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setCurrentSlotIndex(null);
    }
  };

  const handlePromptEdit = (slotId: string, newPrompt: string) => {
    console.log('Editing prompt for slot:', slotId, 'New value:', newPrompt);
    setEditedPrompts(prev => {
      const updated = {
        ...prev,
        [slotId]: newPrompt
      };
      console.log('Updated edited prompts:', updated);
      return updated;
    });
  };

  const savePromptAndRegenerate = async (slot: Slot) => {
    const editedPrompt = editedPrompts[slot.id];
    if (!editedPrompt) return;

    setCurrentSlotIndex(slot.index);
    try {
      const updateResponse = await fetch(`/api/slots/${slot.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imagePrompt: editedPrompt
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update prompt");
      }

      const result = await generateImageForSlot({
        ...slot,
        imagePrompt: editedPrompt
      });

      const updatedSlots = generatedSlots.map(s =>
        s.id === slot.id ? {
          ...s,
          imagePrompt: editedPrompt,
          imageUrl: result.imageUrl
        } : s
      );
      setGeneratedSlots(updatedSlots);

      setEditedPrompts(prev => {
        const newEdits = { ...prev };
        delete newEdits[slot.id];
        return newEdits;
      });

      toast({
        title: "Success",
        description: `Updated prompt and regenerated image for segment ${slot.index + 1}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update prompt and regenerate image for segment ${slot.index + 1}`,
        variant: "destructive",
      });
    } finally {
      setCurrentSlotIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Generate All Images</h2>
          <p className="text-sm text-muted-foreground">
            Generate images for all {slots.length} segments using your approved style
          </p>
        </div>
        <Button
          onClick={generateAllImages}
          disabled={isGenerating}
          size="lg"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin mr-2">⭮</span>
              Generating...
            </>
          ) : (
            "Generate All Images"
          )}
        </Button>
      </div>

      {isGenerating && (
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating images...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">
                Generating image for segment {(currentSlotIndex ?? 0) + 1} of {slots.length}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {generatedSlots.map((slot) => (
          <Card key={slot.id} className="overflow-hidden">
            <CardHeader className="space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Segment {slot.index + 1}</CardTitle>
                  <CardDescription>{slot.timestamp}</CardDescription>
                </div>
                {slot.imageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => savePromptAndRegenerate(slot)}
                    disabled={isGenerating || currentSlotIndex === slot.index}
                  >
                    {currentSlotIndex === slot.index ? (
                      <span className="animate-spin mr-2">⭮</span>
                    ) : (
                      "Save & Regenerate"
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    View Prompt Details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Generated Prompt</Label>
                      <div className="space-y-2">
                        <Textarea
                          key={slot.id}
                          value={(editedPrompts[slot.id] ?? slot.imagePrompt) || ""}
                          onChange={(e) => handlePromptEdit(slot.id, e.target.value)}
                          className="font-mono text-sm mt-1 min-h-[100px] w-full resize-y"
                          placeholder="No prompt generated yet"
                          rows={5}
                        />
                        {editedPrompts[slot.id] !== undefined && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditedPrompts(prev => {
                                  const newEdits = { ...prev };
                                  delete newEdits[slot.id];
                                  return newEdits;
                                });
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => savePromptAndRegenerate(slot)}
                              disabled={isGenerating || currentSlotIndex === slot.index}
                            >
                              {currentSlotIndex === slot.index ? (
                                <>
                                  <span className="animate-spin mr-2">⭮</span>
                                  Saving...
                                </>
                              ) : (
                                "Save & Regenerate"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {slot.continuityMetadata && (
                      <>
                        <div>
                          <Label>Elements to Maintain</Label>
                          <ul className="text-sm mt-1 list-disc list-inside">
                            {slot.continuityMetadata.elementsToMaintain.map((element, i) => (
                              <li key={i}>{element}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <Label>Elements to Evolve</Label>
                          <ul className="text-sm mt-1 list-disc list-inside">
                            {slot.continuityMetadata.elementsToEvolve.map((element, i) => (
                              <li key={i}>{element}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <div className={`relative overflow-hidden ${
                aspectRatio === "16:9" ? "aspect-video" :
                aspectRatio === "9:16" ? "aspect-[9/16]" :
                "aspect-square"
              }`}>
                {slot.imageUrl ? (
                  <img
                    src={slot.imageUrl}
                    alt={`Scene ${slot.index + 1}`}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-muted">
                    <p className="text-sm text-muted-foreground">
                      {isGenerating && currentSlotIndex === slot.index
                        ? "Generating..."
                        : "No image generated yet"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 