import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function getChatCompletion(messages: { role: 'user' | 'assistant'; content: string }[]) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 500,
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error('Error calling OpenAI:', error)
    throw new Error('Failed to get AI response')
  }
} 