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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Slot {
  id: string;
  index: number;
  textSegment: string;
  sceneDescription: string;
  imageUrl?: string;
  imagePrompt?: string;
  videoUrl?: string;
  videoStatus?: string;
  timestamp: string;
}

interface VideoGenProps {
  projectId: string;
  slots: Slot[];
  onSlotsUpdate: (slots: Slot[]) => void;
}

export function VideoGen({ projectId, slots, onSlotsUpdate }: VideoGenProps) {
  const [generatingVideoForSlot, setGeneratingVideoForSlot] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [pollIntervals, setPollIntervals] = useState<Record<string, NodeJS.Timeout>>({});
  const { toast } = useToast();

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollIntervals).forEach(interval => clearInterval(interval));
    };
  }, [pollIntervals]);

  const handlePromptEdit = (slotId: string, newPrompt: string) => {
    setEditedPrompts(prev => ({
      ...prev,
      [slotId]: newPrompt
    }));
  };

  const startPolling = async (slotId: string, predictionId: string) => {
    // Clear any existing interval for this slot
    if (pollIntervals[slotId]) {
      clearInterval(pollIntervals[slotId]);
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/videos/${predictionId}`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.status === "succeeded" && data.output) {
          // Clear the interval
          clearInterval(pollIntervals[slotId]);
          setPollIntervals(prev => {
            const newIntervals = { ...prev };
            delete newIntervals[slotId];
            return newIntervals;
          });

          // Update the slot with the video URL
          const updatedSlots = slots.map(s =>
            s.id === slotId
              ? { ...s, videoUrl: data.output, videoStatus: "COMPLETED" }
              : s
          );
          onSlotsUpdate(updatedSlots);
          setGeneratingVideoForSlot(null);

          toast({
            title: "Success",
            description: `Video generated for segment ${slots.find(s => s.id === slotId)?.index! + 1}`,
          });
        } else if (data.status === "failed") {
          throw new Error("Video generation failed");
        }
      } catch (error) {
        console.error("Error polling video status:", error);
        clearInterval(pollIntervals[slotId]);
        setPollIntervals(prev => {
          const newIntervals = { ...prev };
          delete newIntervals[slotId];
          return newIntervals;
        });
        setGeneratingVideoForSlot(null);

        const updatedSlots = slots.map(s =>
          s.id === slotId
            ? { ...s, videoStatus: "FAILED" }
            : s
        );
        onSlotsUpdate(updatedSlots);

        toast({
          title: "Error",
          description: "Failed to generate video. Please try again.",
          variant: "destructive",
        });
      }
    }, 5000); // Poll every 5 seconds

    setPollIntervals(prev => ({
      ...prev,
      [slotId]: interval
    }));
  };

  const generateVideo = async (slot: Slot) => {
    if (!slot.imageUrl) {
      toast({
        title: "Error",
        description: "No image available for video generation",
        variant: "destructive",
      });
      return;
    }

    setGeneratingVideoForSlot(slot.id);
    try {
      const response = await fetch("/api/videos/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slotId: slot.id,
          prompt: editedPrompts[slot.id] || slot.imagePrompt,
          imageUrl: slot.imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start video generation");
      }

      // Update slot status
      const updatedSlots = slots.map(s =>
        s.id === slot.id
          ? { ...s, videoStatus: "PROCESSING" }
          : s
      );
      onSlotsUpdate(updatedSlots);

      // Start polling for status
      startPolling(slot.id, data.predictionId);

      toast({
        title: "Video Generation Started",
        description: "This may take a few minutes to complete.",
      });
    } catch (error) {
      console.error("Error generating video:", error);
      setGeneratingVideoForSlot(null);
      toast({
        title: "Error",
        description: "Failed to start video generation",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot) => (
          <Card key={slot.id} className="overflow-hidden">
            <CardHeader className="space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Segment {slot.index + 1}</CardTitle>
                  <CardDescription>{slot.timestamp}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Preview */}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                {slot.imageUrl ? (
                  <img
                    src={slot.imageUrl}
                    alt={`Scene ${slot.index + 1}`}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <p className="text-sm text-muted-foreground">No image available</p>
                  </div>
                )}
              </div>

              {/* Prompt Editor */}
              <div className="space-y-2">
                <Label>Video Generation Prompt</Label>
                <Textarea
                  value={editedPrompts[slot.id] ?? slot.imagePrompt ?? ""}
                  onChange={(e) => handlePromptEdit(slot.id, e.target.value)}
                  placeholder="Enter prompt for video generation"
                  className="min-h-[80px]"
                />
              </div>

              {/* Generate Video Button */}
              <Button
                onClick={() => generateVideo(slot)}
                disabled={!slot.imageUrl || generatingVideoForSlot === slot.id || slot.videoStatus === "PROCESSING"}
                className="w-full"
              >
                {generatingVideoForSlot === slot.id || slot.videoStatus === "PROCESSING" ? (
                  <>
                    <span className="animate-spin mr-2">⭮</span>
                    Generating Video...
                  </>
                ) : slot.videoStatus === "COMPLETED" ? (
                  "Regenerate Video"
                ) : (
                  "Generate Video"
                )}
              </Button>

              {/* Video Preview */}
              {slot.videoUrl && (
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  <video
                    src={slot.videoUrl}
                    controls
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Status Message */}
              {slot.videoStatus === "FAILED" && (
                <p className="text-sm text-destructive">
                  Video generation failed. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 