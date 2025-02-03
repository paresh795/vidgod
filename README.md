# VidGod - AI-Powered Video Generation Platform

VidGod is a powerful web application that transforms text and images into captivating videos using AI. Built with Next.js, Prisma, and Replicate's AI models, it offers a seamless workflow for generating professional videos from your content.

## 🌟 Features

- 🎯 Text-to-Speech narration generation
- 🖼️ AI-powered image generation for scenes
- 🎬 Video generation from images with motion
- 📝 Scene segmentation and management
- 🎨 Style sampling and consistency
- 📱 Responsive modern UI
- 🔄 Real-time status updates

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **AI Services**: Replicate API
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
Create a `.env` file in the root directory with the following:

```env
DATABASE_URL="file:./prisma/dev.db"
REPLICATE_API_TOKEN="your_replicate_api_key"
ELEVENLABS_API_KEY="your_elevenlabs_api_key"  # Optional for TTS
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

Visit `http://localhost:3000` to see the application.

## 🔧 Configuration

### Required Environment Variables:
- `DATABASE_URL`: SQLite database URL
- `REPLICATE_API_TOKEN`: Your Replicate API key

### Optional Environment Variables:
- `ELEVENLABS_API_KEY`: For text-to-speech functionality
- `NEXT_PUBLIC_APP_URL`: Your production URL

## 🎮 Usage

1. **Create a New Project**:
   - Enter your script text
   - Choose a voice for narration
   - Generate the audio narration

2. **Scene Segmentation**:
   - Review auto-generated segments
   - Adjust timings if needed
   - Add scene descriptions

3. **Style Sampling**:
   - Choose visual style
   - Generate sample images
   - Approve style for consistency

4. **Image Generation**:
   - Generate images for each scene
   - Edit prompts if needed
   - Review and regenerate if necessary

5. **Video Generation**:
   - Generate videos for each scene
   - Preview and download videos
   - Combine into final output

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Replicate](https://replicate.com/) for AI models
- [ElevenLabs](https://elevenlabs.io/) for TTS capabilities
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Next.js](https://nextjs.org/) for the framework
- [Prisma](https://www.prisma.io/) for database ORM

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.
