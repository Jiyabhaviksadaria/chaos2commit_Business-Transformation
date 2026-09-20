// Deterministic mock fixtures based on task name
const FIXTURES: Record<string, unknown> = {
  requirements: {
    title: "Business Requirements Document",
    sections: [
      { id: "1", title: "Objective", content: "To automate the mock workflow." }
    ]
  },
  process_analysis: {
    asIs: "Manual legacy process",
    toBe: "Automated standard process",
    bottlenecks: ["Data entry delay"]
  },
  default: {
    mock_data: true,
    message: "This is a deterministic mock response from the AI mock provider."
  }
}

export async function generateMockContent(task: string): Promise<string> {
  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  const data = FIXTURES[task] || FIXTURES["default"]
  return JSON.stringify(data)
}

export async function* mockChatStream(): AsyncIterable<string> {
  const words = ["This ", "is ", "a ", "streamed ", "mock ", "response."]
  for (const word of words) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    yield word
  }
}
