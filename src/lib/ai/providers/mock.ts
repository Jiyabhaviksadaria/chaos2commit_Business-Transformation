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

function abortError(): Error {
  const error = new Error("The operation was aborted")
  error.name = "AbortError"
  return error
}

function waitForChunk(abortSignal?: AbortSignal): Promise<void> {
  if (abortSignal?.aborted) return Promise.reject(abortError())

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      abortSignal?.removeEventListener("abort", onAbort)
      resolve()
    }, 100)
    const onAbort = () => {
      clearTimeout(timeout)
      reject(abortError())
    }
    abortSignal?.addEventListener("abort", onAbort, { once: true })
  })
}

export async function* mockChatStream(abortSignal?: AbortSignal): AsyncIterable<string> {
  const words = ["This ", "is ", "a ", "streamed ", "mock ", "response."]
  for (const word of words) {
    await waitForChunk(abortSignal)
    if (abortSignal?.aborted) throw abortError()
    yield word
  }
}
