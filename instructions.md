
# **PRODUCT REQUIREMENTS DOCUMENT (PRD)**

## **1. Project Overview**

**Product Name**: *Narrative Media Generator (with Chat, TTS, Image & Video Gen)*

**Primary Goal**:  
1. **Chat** with an LLM to refine a user’s story.  
2. **Create** a final script for TTS narration.  
3. Generate **audio** using **ElevenLabs** and measure duration for 5-second segmentation.  
4. Generate **images** for each segment using **Replicate** (Flux model).  
5. **Convert** selected images into **video** clips (Mandatory).  
6. Provide a final **review** page where the user can download all assets.

### **Key Tech Choices**

- **Next.js** 13 + shadcn UI.  
- **SQLite** for data storage (using an ORM like Prisma is recommended).  
- **Environment Variables** in `.env` for keys/secrets.  
- **Hybrid Routing** approach with a few distinct pages (`/chat`, `/create`, `/review`).

---

## **2. Detailed Feature Flow**

### **2.1 Chat & Final Script**

1. **Page**: `/chat`  
   - **Purpose**: Users converse with a cheaper LLM (like “gpt-4o”) to brainstorm and refine the story.  
   - **UI**: Typical chat messages (user vs. AI).  
   - **Final Script Box**: Once satisfied, the user copies the final script into a dedicated text box.  
   - **Action**: “Save & Proceed” → Stores the final script in the database (Project table) and navigates to `/create`.

#### Chat Interface & Prompt Configuration

1. **Chat Objective**  
   The chat interface is not just a freeform conversation; it actively helps the user craft or refine a story by:  
   - Asking clarifying questions about the story’s tone, genre, characters, desired length, etc.  
   - Offering structured suggestions or mini-outlines to guide the user.  
   - Iterating until the user is satisfied with a final story concept (which they then copy into the “Final Script” box).

2. **Prompt Engineering Approach**  
   - **Initial System Prompt**  
     - “You are a story-writing mentor. The user wants to develop a short story for narration. Ask clarifying questions about tone, characters, setting, and length to fully understand their vision. Then, provide a refined story outline or draft. Continue to refine it until the user is satisfied.”  
   - **Conversation Flow**  
     - Each time the user provides input, the LLM:  
       1. Checks what’s already known about the story (genre, tone, setting, etc.).  
       2. Identifies any missing or ambiguous points.  
       3. Asks up to 1–3 targeted questions to clarify.  
       4. Suggests new additions or modifications to improve the story.  
   - **Persisting Chat Context**  
     - The front-end or server retains conversation history (or relevant “summary” tokens) so the LLM sees the story evolution.  
   - **Finalizing**  
     - Once the user states “Yes, I’m happy with this story,” the LLM outputs a final structured draft.  
     - The user copies that into the “Final Script” box.

3. **Example Chat Flow (Illustrative)**  
   - **User**: “I want a scary story about an abandoned hospital.”  
   - **LLM (Mentor role)**: “Okay! Are you imagining a modern setting or a historical period? Do you want ghosts, zombies, or psychological horror? Also, do you prefer a short 2-minute story or something longer?”  
   - **User**: “Let’s keep it modern, psychological horror, and about 3 minutes long.”  
   - **LLM**: “Great! So a 3-minute psychological horror story in a modern abandoned hospital. Are there key characters or a particular twist you want at the end?”  
   - **User**: “Yes, I want a twist that it’s actually a dream. Also, maybe a mention of a silhouette in the corridors.”  
   - **LLM**: “Understood. Here’s a short outline…”  
   - …and so on, until the user is fully satisfied.

4. **Implementation Details**  
   - **API Usage**: Possibly `POST /api/chat` in Next.js, each request containing a `messages` array.  
   - **OpenAI vs. Cheaper LLM**: Adapt the prompt style to whichever model is used.  
   - **User Experience**: LLM is explicitly the “Story Mentor.”

5. **Integration with the Existing PRD**  
   - The route `/chat` remains the user’s main interface for story refinement.  
   - The final script is saved to the DB, then we move on to TTS and so forth.

---

### **2.2 TTS Generation (ElevenLabs)**

1. **Page**: `/create` (first step)  
   - **Script Retrieval**: Load the user’s final script from the DB.  
   - **Generate Narration** button → Calls ElevenLabs TTS endpoint:  
     - `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128`  
     - Uses `xi-api-key: <ELEVENLABS_API_KEY>` in headers.  
     - If response includes a “history item” ID, call `POST /v1/history/download` to fetch `.mp3`.  
   - **Audio Storage**: Save the `.mp3` locally or in a folder.  
   - **Audio Length**: Use something like `ffprobe` to get the total seconds. Store in the DB for segment calculation.

#### **2.2.1 Segmenting the Script & Generating Detailed Prompts (LLM)**

- **Objective**: Once we have the **audio duration** (e.g., 70 seconds), we know we’ll have \(\lceil 70/5 \rceil = 14\) “slots” (5-second segments). For each slot, we want **highly detailed prompts** describing what the image should depict.  
- **Process**:  
  1. **Divide** the final script text into approximate segments matching the time slots. (This can be done by a naive approach: total story word count vs. total time, or the user can define the chunk boundaries if they prefer more control.)  
  2. **LLM Prompting**:  
     - We feed each segment’s text and relevant story context to an LLM that is specialized for prompt generation. The LLM’s system prompt might say:  
       > “You are a visual prompt engineer. Given the following story context and text for a certain timeslot, produce a richly detailed prompt describing the mood, color scheme, camera angle, style, etc.”  
     - The LLM returns a meticulously crafted prompt.  
  3. **Store**: We store each timeslot’s final prompt in the DB (e.g., `Slot.textSegment` or a new field like `Slot.imagePrompt`).  
  4. **Sample Prompt Testing**:  
     - We might test the first 1–2 prompts quickly to see if the user likes the style. If the user disapproves, we refine the LLM’s approach.  
  5. **Proceed**: Once the user is satisfied with how prompts look, we continue to style sampling and bulk generation.

---

### **2.3 Style Sampling & Bulk Image Generation (Replicate Flux)**

1. **Style Sampling**  
   - On the same `/create` page, user triggers “Generate Sample Image(s)” for 1–2 scene previews **using the newly created detailed prompts** from the prior step.  
   - **Replicate** call (Flux model), e.g.:
     ```json
     {
       "version": "FLUX_MODEL_VERSION_ID",
       "input": {
         "prompt": "Sample prompt text",
         "width": 512,
         "height": 512,
         "aspect_ratio": "1:1",
         "seed": 42,
         "output_format": "png"
       }
     }
     ```
   - System polls until `status = "succeeded"`. User can “Regenerate” or “Approve.” Approved style cues get stored.

2. **Bulk Image Generation**  
   - Once style is approved, user clicks “Generate All Scenes.”  
   - The system calculates \(\lceil \frac{\text{audioDuration}}{5} \rceil\) segments (already done) and loops over them.  
   - For each segment, merges the **style prompt** plus the **LLM-generated prompt** for that specific timeslot → calls Replicate.  
   - Displays all generated images in a gallery.

---

### **2.4 Image → Video (Mandatory)**

1. **Convert to Video**: Next to each image in the gallery, have a “Convert to Video” (or “Animate”) button.  
2. **API**: The developer will ask for (and integrate) the final image→video API docs at this step.  
   - For instance, a custom replicate model or another service that takes an image URL and returns a short animated clip.  
3. **Storage**: Once the video is generated, store the video URL or file reference in the DB.  
4. **UI**: The user can view or re-generate the short clip if unsatisfied.

### **2.5 Review & Download**

1. **Page**: `/review`  
   - Displays the TTS audio file, final images, and any video clips.  
   - A “Download All” or “Export” button for the user to retrieve everything.  
2. **Completion**: The user has all assets (narration audio, images, videos) for manual assembly outside the system.

---

## **3. Data & Environment Management**

### **3.1 SQLite Database**

**Reasons**:  
- Light overhead, easy local file.  
- Sufficient for single-user or small-scale multi-user.  

**Schema** (using Prisma as an example):
```prisma
model Project {
  id             String   @id @default(uuid())
  createdAt      DateTime @default(now())
  finalScript    String
  ttsAudioUrl    String?
  audioDuration  Int?
  stylePrompt    String?

  slots          Slot[]
}

model Slot {
  id          String   @id @default(uuid())
  index       Int
  textSegment String?    // optional text for each scene
  imagePrompt String?    // new field if needed for the LLM-generated visual prompt
  imageUrl    String?
  videoUrl    String?    // for the image->video clip
  isApproved  Boolean @default(false)

  projectId   String
  project     Project @relation(fields: [projectId], references: [id])
}
```

### **3.2 Environment Variables**

Keep in `.env`, which **is not** checked into version control:

```
ELEVENLABS_API_KEY="..."
REPLICATE_API_KEY="..."
FLUX_MODEL_VERSION_ID="..."
DATABASE_URL="file:./prisma/dev.db"
# Additional keys for image->video once provided
```

---

## **4. Project Structure (ASCII)**

An example using Next.js (App Router) + shadcn + SQLite (via Prisma or another ORM):

```
my-narrative-app/
├─ app/
│   ├─ chat/
│   │   ├─ page.tsx                 // Chat UI for LLM-based story refinement
│   │   └─ components/
│   │       └─ ChatBox.tsx
│   ├─ create/
│   │   ├─ page.tsx                 // TTS + segmenting + prompt generation + style sampling + bulk image gen + image->video
│   │   └─ components/
│   │       ├─ TtsGenerator.tsx
│   │       ├─ SegmentPromptsLLM.tsx // LLM-based prompt generation for each timeslot
│   │       ├─ SampleImageGen.tsx
│   │       ├─ BulkImageGen.tsx
│   │       └─ ImageToVideo.tsx
│   ├─ review/
│   │   ├─ page.tsx                 // Final overview & download
│   │   └─ components/
│   │       └─ AssetGallery.tsx
│   ├─ layout.tsx
│   └─ page.tsx                     // Possibly a landing or redirect
├─ prisma/
│   ├─ schema.prisma                // SQLite schema
├─ lib/
│   ├─ replicate.ts                 // Helper calls to Replicate
│   ├─ elevenLabs.ts                // Helper calls to ElevenLabs
│   ├─ audioUtils.ts                // ffprobe-based audio length checks
│   ├─ db.ts                        // Prisma or direct SQLite init
│   └─ imageToVideo.ts             // Once we have the API docs
├─ components/                      // Reusable shadcn UI components
├─ .env
├─ .gitignore
├─ package.json
└─ tsconfig.json
```

---

## **5. Development Phases & Testing**

### **Phase 1: Project Initialization & Chat**

1. **Tasks**:  
   - Next.js + shadcn setup.  
   - `/chat` route with LLM chat.  
   - Final script box → “Save & Proceed” → create a `Project` in SQLite.  
2. **Testing**:  
   - **Manual**: Confirm chat flow + final script storage.

### **Phase 2: TTS Integration**

1. **Tasks**:  
   - `/create` loads the project’s script.  
   - “Generate Narration” calls ElevenLabs; store `.mp3`.  
   - Audio length → store `audioDuration`.  
2. **Testing**:  
   - Generate a short script, confirm `.mp3` file.  
   - Check error handling (invalid API key, etc.).

### **Phase 3: Segmenting & LLM Prompt Generation**

1. **Tasks**:  
   - Based on `audioDuration`, compute timeslots (e.g., every 5 seconds).  
   - Chunk or label the final script to correspond to these timeslots.  
   - Use an LLM-based approach to produce a **detailed prompt** for each timeslot’s text.  
   - Possibly let the user review 1–2 test prompts.  
2. **Testing**:  
   - **Manual**: Confirm we get rich prompts (camera angles, color, mood).  
   - Check the iteration if prompts are unsatisfactory.

### **Phase 4: Style Sampling (1–2 Images)**

1. **Tasks**:  
   - “Generate Sample Image(s)” with Replicate (Flux).  
   - Integrate the newly generated prompts from Phase 3.  
   - Store final style prompt if user “Approves.”  
2. **Testing**:  
   - **Manual**: Try different prompts, confirm results are consistent.

### **Phase 5: Bulk Image Generation**

1. **Tasks**:  
   - For each slot, combine style + the timeslot’s LLM prompt → call Replicate.  
   - Display a gallery.  
   - Let the user regenerate a specific slot if needed.  
2. **Testing**:  
   - **Manual**: Test 5–10–15 slot scenarios.  
   - Check concurrency or rate-limit issues.

### **Phase 6: Image→Video Integration (Mandatory)**

1. **Tasks**:  
   - **Button**: Next to each image in the gallery → “Convert to Video.”  
   - The system calls an **image→video** API (docs to be provided).  
   - Poll until success; store the final `videoUrl` in the relevant `Slot`.  
2. **Developer Prompt**:  
   - The developer should request the image→video API details at this point.  
   - Implement, handle errors, etc.  
3. **Testing**:  
   - **Manual**: Animate some images, confirm the generated clip is valid.  
   - Possibly re-try if the user doesn’t like the result.

### **Phase 7: Review & Download**

1. **Tasks**:  
   - `/review`: Show the TTS audio, final images, videos.  
   - Provide “Download All” or individual links.  
   - Mark the project as “complete” in the DB.  
2. **Testing**:  
   - **Manual**: Confirm all assets can be downloaded.  
   - **Regression**: End-to-end test from chat → TTS → segment prompts → images → videos → final.

---

## **6. Testing Strategy**

1. **Unit Tests**  
   - For utility code: `audioUtils.ts`, `replicate.ts`, LLM prompt logic, etc.  
2. **Integration Tests**  
   - Mock external calls to ElevenLabs, Replicate, and the LLM.  
   - Ensure DB operations (SQLite) are correct.  
3. **Manual UI Tests**  
   - Test entire flows, especially image→video and the step of generating detailed prompts.  
4. **Regression**  
   - After each major phase, ensure previous steps remain functional.

---

## **7. Deployment & Environment**

1. **Local Development**  
   - `npm install`  
   - `npx prisma migrate dev` (if using Prisma)  
   - `npm run dev`  
   - **.env** must include keys for ElevenLabs, Replicate, and any future image→video service.  
2. **Production**  
   - Host on Vercel or similar.  
   - Migrate `.env` variables to the platform’s secrets manager.  
   - Confirm `.db` file strategy for production (e.g., persistent volume or external DB).

---

## **8. Final Notes**

This **PRD** now **explicitly includes** the step where we **segment** the script based on audio length, then use an **LLM** to generate **detailed prompts** for each 5-second slot before proceeding with style sampling and bulk image generation. It also maintains the **mandatory** Image→Video flow. 

With this document, the team should:

- **Clearly** follow the route structure (`/chat`, `/create`, `/review`),  
- Understand the **LLM-based prompt generation** for each timeslot,  
- Manage data in **SQLite**,  
- Store environment keys in `.env`,  
- And adhere to the phased approach with thorough testing.

**End of PRD**  

This final version **does not remove** any important sections, only **adds** the crucial sub-step (2.2.1) explaining how to **segment** the audio and produce **rich image prompts** from the LLM. You can now proceed with development knowing each part of the workflow is covered.