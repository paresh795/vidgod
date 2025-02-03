"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VoiceSelector } from "@/components/voice-selector"
import { SegmentDisplay } from "./components/SegmentDisplay"
import { StyleSampling } from "./components/StyleSampling"
import { BulkImageGen } from "./components/BulkImageGen"
import { VideoGen } from "./components/VideoGen"

interface Project {
  id: string
  finalScript: string
  ttsAudioUrl?: string
  audioDuration?: number
  stylePrompt?: string
  aspectRatio?: string
  stylePreviewUrl?: string
  slots?: Array<{
    id: string
    index: number
    textSegment: string
    sceneDescription: string
    timestamp: string
    isApproved: boolean
    imageUrl?: string
    imagePrompt?: string
    videoUrl?: string
  }>
}

export default function CreatePage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string>("")

  const updateProjectSlots = (updatedSlots: any[]) => {
    setProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slots: updatedSlots
      };
    });
  };

  useEffect(() => {
    const projectId = searchParams.get("id")
    if (!projectId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No project ID provided",
      })
      return
    }

    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) throw new Error("Failed to fetch project")
        const data = await response.json()
        setProject(data)
        if (data.ttsAudioUrl) {
          setAudioUrl(data.ttsAudioUrl)
        }
      } catch (error) {
        console.error("Error fetching project:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load project. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [searchParams, toast])

  const handleGenerateNarration = async () => {
    if (!project || !selectedVoiceId) return

    setIsGenerating(true)
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: project.finalScript,
          voiceId: selectedVoiceId,
          projectId: project.id,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate narration")

      const data = await response.json()
      setAudioUrl(data.audioUrl)
      
      // Update project with audio URL and duration
      setProject(prev => {
        if (!prev) return null
        return {
          ...prev,
          ttsAudioUrl: data.audioUrl,
          audioDuration: data.audioDuration
        }
      })

      toast({
        title: "Success",
        description: "Narration generated successfully!",
      })
    } catch (error) {
      console.error("Error generating narration:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate narration. Please try again.",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStyleApproved = async (stylePrompt: string, aspectRatio: string) => {
    if (!project) return;
    
    setProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        stylePrompt,
        aspectRatio
      };
    });
  };

  const handleSegmentationComplete = async () => {
    // Fetch updated project data
    try {
      const response = await fetch(`/api/projects/${project?.id}`)
      if (!response.ok) throw new Error("Failed to fetch project")
      const data = await response.json()
      setProject(data)
    } catch (error) {
      console.error("Error fetching updated project:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update project state. Please refresh the page.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Error</h2>
          <p className="text-muted-foreground">Failed to load project.</p>
          <Button onClick={() => window.location.href = "/chat"}>
            Return to Chat
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <main className="container mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Create Media</h1>
        <Button variant="outline" onClick={() => window.location.href = "/chat"}>
          Back to Chat
        </Button>
      </div>

      <Tabs defaultValue="narration" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="narration">1. Narration</TabsTrigger>
          <TabsTrigger value="segments" disabled={!project.ttsAudioUrl || !project.audioDuration}>
            2. Segments
          </TabsTrigger>
          <TabsTrigger value="style" disabled={!project.slots?.length}>
            3. Style
          </TabsTrigger>
          <TabsTrigger value="images" disabled={!project.stylePrompt}>
            4. Images
          </TabsTrigger>
          <TabsTrigger value="videos" disabled={!project.slots?.some(slot => slot.imageUrl)}>
            5. Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="narration" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Generate Narration</h2>
            <div className="prose max-w-none mb-6">
              <h3>Your Script:</h3>
              <p className="whitespace-pre-wrap">{project.finalScript}</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Select Voice</h3>
                <VoiceSelector
                  onVoiceSelect={setSelectedVoiceId}
                  disabled={isGenerating}
                />
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={handleGenerateNarration}
                  disabled={!selectedVoiceId || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? "Generating..." : "Generate Narration"}
                </Button>

                {audioUrl && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Preview</h3>
                    <audio controls className="w-full">
                      <source src={audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card className="p-6">
            {project.audioDuration ? (
              <SegmentDisplay
                projectId={project.id}
                audioDuration={project.audioDuration}
                script={project.finalScript}
                onSegmentationComplete={handleSegmentationComplete}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Please generate narration first to create segments
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="style" className="space-y-4">
          <Card className="p-6">
            {project.slots?.length ? (
              <StyleSampling
                projectId={project.id}
                onStyleApproved={handleStyleApproved}
                initialSegment={project.slots[0]}
                initialStyle={project.stylePrompt ? {
                  stylePrompt: project.stylePrompt,
                  aspectRatio: project.aspectRatio || "1:1",
                  previewUrl: project.stylePreviewUrl || ""
                } : undefined}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Please generate segments first to create style samples
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <Card className="p-6">
            {project?.stylePrompt && project?.slots?.length ? (
              <BulkImageGen
                projectId={project.id}
                slots={project.slots}
                stylePrompt={project.stylePrompt}
                aspectRatio={project.aspectRatio || "1:1"}
                onSlotsUpdate={updateProjectSlots}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Please complete style sampling first to generate images for all segments.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <Card className="p-6">
            {project?.slots?.some(slot => slot.imageUrl) ? (
              <VideoGen
                projectId={project.id}
                slots={project.slots}
                onSlotsUpdate={updateProjectSlots}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Please generate images first to create videos.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
} 