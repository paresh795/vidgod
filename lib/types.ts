export interface StoryContext {
  story: {
    overview: string;
    themes: string[];
    setting: {
      location: string;
      environment: string;
      timeframe: string;
    };
    characters: {
      evolution: string[];
      visualTraits: string[];
    };
  };
  style: {
    visualStyle: string;
    cinematicElements: string[];
    colorPalette: string;
    lighting: string;
  };
  aspectRatio: string;
}

export interface VisualContinuity {
  elementsToMaintain: string[];
  elementsToEvolve: string[];
}

export interface GeneratedPrompt {
  sceneIndex: number;
  prompt: string;
  visualContinuity: VisualContinuity;
}

export interface PromptGenerationResponse {
  prompts: GeneratedPrompt[];
  metadata: {
    storyContext: StoryContext;
    globalNegativePrompt: string;
  };
} 