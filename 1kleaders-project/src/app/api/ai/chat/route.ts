// POST /api/ai/chat
// Proxies messages to Anthropic API server-side
// Body: { messages: [{role, content}][], system? }
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are the 1K Leaders AI Assistant — a smart, helpful advisor for partners and shareholders of 1K Leaders, a venture capital and innovation platform based in Abu Dhabi (ADGM regulated).

Your role is to:
- Help partners refine and evaluate startup ideas using the VEP Score framework (Product/Service /25, Market Opportunity /25, Competitive Advantage /25, Business Model /25 = 100 total)
- Provide market insights and trend analysis focused on MENA region
- Help partners structure business model canvases, pitch decks, and feasibility thinking
- Answer questions about 1K Leaders platform processes
- Be concise, professional, and encouraging

VEP Score framework:
- Product/Service (0-25): Innovation, uniqueness, technical feasibility
- Market Opportunity (0-25): Market size, accessibility, timing
- Competitive Advantage (0-25): Defensibility, moat, differentiation
- Business Model (0-25): Revenue credibility, sustainability, scalability

Keep responses focused and actionable. Format with bullet points where helpful. Don't be verbose.`;

export async function POST(req: NextRequest) {
  const { messages, system } = await req.json();

  if (!messages?.length) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 1000,
      system:     system ?? SYSTEM_PROMPT,
      messages,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Anthropic API error:', data);
    return NextResponse.json({ error: data.error?.message ?? 'AI error' }, { status: 500 });
  }

  return NextResponse.json({ content: data.content?.[0]?.text ?? '' });
}
