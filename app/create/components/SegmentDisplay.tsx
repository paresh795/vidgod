import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface Segment {
  id: string;
  index: number;
  textSegment: string;
  sceneDescription: string;
  timestamp: string;
  isApproved: boolean;
}

interface SegmentDisplayProps {
  projectId: string;
  audioDuration: number;
  script: string;
  onSegmentationComplete?: () => void;
}

export function SegmentDisplay({
  projectId,
  audioDuration,
  script,
  onSegmentationComplete,
}: SegmentDisplayProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSegments = async () => {
    try {
      const response = await fetch(`/api/segments/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch segments");
      const data = await response.json();
      setSegments(data.slots);
    } catch (error) {
      console.error("Error fetching segments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch segments",
        variant: "destructive",
      });
    }
  };

  const generateSegments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/segments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          script,
          audioDuration,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate segments");
      }
      
      const data = await response.json();
      setSegments(data.slots);
      toast({
        title: "Success",
        description: "Script segments generated successfully",
      });
      if (onSegmentationComplete) {
        onSegmentationComplete();
      }
    } catch (error) {
      console.error("Error generating segments:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate segments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSegments();
    }
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Script Segments</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generate segments based on your audio duration ({audioDuration.toFixed(1)} seconds)
            </p>
          </div>
          <Button
            onClick={generateSegments}
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⭮</span>
                Generating...
              </>
            ) : (
              "Generate Segments"
            )}
          </Button>
        </div>

        {segments.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {segments.length} segments created ({(audioDuration / segments.length).toFixed(1)} seconds per segment)
          </p>
        )}
      </div>

      {segments.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">No Segments Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click the button above to generate segments based on your script and audio duration.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {segments.map((segment) => (
            <Card key={segment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Segment {segment.index + 1}</CardTitle>
                    <CardDescription>{segment.timestamp}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Scene Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {segment.sceneDescription}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Script</h4>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                      {segment.textSegment}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 