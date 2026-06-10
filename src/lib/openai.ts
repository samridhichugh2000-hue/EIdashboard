export type FeedbackQuality = "below" | "satisfactory" | "above";

const SYSTEM_PROMPT = `You are an HR performance classifier for 90-day employee evaluations at Koenig Solutions.
Given manager feedback about a new employee, classify it as exactly one of:
- "above"  — exceeds expectations, strong performance, positive tone, good discipline, suitable for role
- "satisfactory" — meets expectations, average, acceptable, no major concerns
- "below"  — performance concerns, needs improvement, negative tone, discipline issues, not suitable

Reply with only the single lowercase word. No punctuation, no explanation.`;

export async function classifyFeedbackQuality(feedbackText: string): Promise<FeedbackQuality> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: feedbackText.slice(0, 800) },
      ],
      max_tokens: 5,
      temperature: 0,
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content?.trim().toLowerCase() as string;
  if (answer === "below" || answer === "satisfactory" || answer === "above") return answer;
  return "satisfactory";
}
