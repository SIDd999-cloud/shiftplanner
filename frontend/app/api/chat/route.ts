import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  const { messages, system } = await req.json()
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system,
    messages,
  })
  const reply = message.content.find((b: any) => b.type === "text")?.text ?? ""
  return NextResponse.json({ reply })
}
