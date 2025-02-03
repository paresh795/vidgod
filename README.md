# VidGod - AI-Powered Video Generation Platform

VidGod is an innovative AI-powered platform that transforms your stories into captivating videos through a seamless, automated workflow. Starting from a simple conversation, it guides you through the entire video creation process - from script development to final video generation, all powered by cutting-edge AI technology.

## 🌟 Features & Workflow

### 1. Interactive Story Development
- 🤖 AI-powered chat interface for story development
- 💡 Intelligent suggestions and refinements
- 📝 Collaborative script creation

### 2. Professional Narration
- 🎯 Text-to-Speech generation using ElevenLabs
- 🎙️ Multiple voice options
- 🎭 Emotion-aware narration

### 3. Smart Scene Segmentation
- ⚡ Automatic audio segmentation into 5-6 minute scenes
- 🎬 Intelligent scene boundary detection
- 📊 Timeline visualization and management

### 4. AI-Powered Visual Generation
- 🎨 Style sampling and consistency management
- 🖼️ Bulk image generation for all scenes
- ✨ Customizable visual prompts
- 🎭 Scene-specific style adjustments

### 5. Dynamic Video Creation
- 🎬 Image-to-video transformation
- 🔄 Motion generation and enhancement
- 📹 Scene-by-scene video preview
- 🎞️ Consistent visual style across scenes

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **AI Services**: 
  - Replicate API for image and video generation
  - ElevenLabs for text-to-speech
- **Authentication**: (Optional) Auth.js

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Replicate API key
- (Optional) ElevenLabs API key for TTS

## 💻 Installation

1. Clone the repository:

```bash
git clone https://github.com/paresh795/vidgod.git
cd vidgod
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

4. Initialize the database:

```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000/chat` to start using the application.

## 🔧 Configuration

### Required Environment Variables:
- `DATABASE_URL`: SQLite database URL
- `REPLICATE_API_TOKEN`: Your Replicate API key

### Optional Environment Variables:
- `ELEVENLABS_API_KEY`: For text-to-speech functionality
- `NEXT_PUBLIC_APP_URL`: Your production URL

## 🎮 Detailed Usage Guide

1. **Start Your Project** (`/chat`):
   - Begin by describing your story to the AI
   - Collaborate with AI to refine your script
   - Review and approve the final script

2. **Create Narration** (`/create`):
   - Select from multiple AI voice options
   - Generate professional narration
   - Preview and adjust the audio

3. **Scene Segmentation**:
   - AI automatically segments your narration
   - Review scene boundaries and timings
   - Add or edit scene descriptions
   - Approve segmentation

4. **Style Development**:
   - Choose initial visual style
   - Generate and review style samples
   - Refine style parameters
   - Ensure visual consistency

5. **Bulk Image Generation**:
   - Auto-generate images for all scenes
   - Review and edit scene prompts
   - Regenerate specific images if needed
   - Maintain style consistency

6. **Video Creation**:
   - Transform images into fluid videos
   - Preview each scene's video
   - Adjust motion parameters
   - Download final videos

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`