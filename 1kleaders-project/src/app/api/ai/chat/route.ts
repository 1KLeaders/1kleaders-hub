// POST /api/ai/chat
// Proxies messages to Lyzr Agent API
// Body: { message, session_id?, agent_id? }
import { NextRequest, NextResponse } from 'next/server';

const LYZR_API_KEY        = process.env.LYZR_API_KEY!;
const LYZR_ENDPOINT       = 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/';
const GENERAL_AGENT_ID    = process.env.LYZR_GENERAL_AGENT_ID ?? '6a56ae6225b9b20ee17c54e7';
const IDEA_AGENT_ID       = process.env.LYZR_IDEA_AGENT_ID   ?? '6a56ae6225b9b20ee17c54e7'; // update when idea agent is created
const LYZR_USER_ID        = process.env.LYZR_USER_ID         ?? '1000leadersholdings@gmail.com';

export async function POST(req: NextRequest) {
  const { message, session_id, agent_type } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  if (!LYZR_API_KEY) {
    return NextResponse.json({ error: 'AI not configured — add LYZR_API_KEY to environment variables' }, { status: 503 });
  }

  const agent_id  = agent_type === 'idea' ? IDEA_AGENT_ID : GENERAL_AGENT_ID;
  // Use provided session_id or generate a stable one from agent_id
  const sessionId = session_id ?? `${agent_id}-${Date.now()}`;

  const res = await fetch(LYZR_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    LYZR_API_KEY,
    },
    body: JSON.stringify({
      user_id:    LYZR_USER_ID,
      agent_id,
      session_id: sessionId,
      message,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Lyzr API error:', data);
    return NextResponse.json({ error: data.message ?? 'AI error' }, { status: 500 });
  }

  // Lyzr returns { response: "..." } or { message: "..." }
  const content = data.response ?? data.message ?? data.output ?? '';

  return NextResponse.json({ content, session_id: sessionId });
}
