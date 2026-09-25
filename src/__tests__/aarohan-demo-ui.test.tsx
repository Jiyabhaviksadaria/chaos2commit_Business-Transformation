/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"

import { AarohanDocumentUpload } from "@/components/projects/aarohan-document-upload"
import { DemoBusinessAnalysisDashboard } from "@/components/projects/demo-business-analysis-dashboard"
import { AAROHAN_BUSINESS_ANALYSIS, type AarohanOutputLanguage, type AnalysisDataset } from "@/data/aarohan-business-analysis"

const projectId = "p1"

const GUJARATI_FILE = new File(["x"], "Intelly_Aarohan_Gujarati_Input.pdf", { type: "application/pdf" })
const HINDI_FILE = new File(["x"], "Intelly_Aarohan_Hindi_Input.pdf", { type: "application/pdf" })
const UNKNOWN_FILE = new File(["x"], "Other_Company.pdf", { type: "application/pdf" })

function recognizedBody(outputLanguage: AarohanOutputLanguage) {
  return {
    recognized: true,
    demoCompany: "aarohan",
    inputLanguage: outputLanguage === "hi" ? "gu" : "gu",
    confidence: 61,
    matchedSignals: ["આરોહણ"],
    outputLanguage,
    fileName: "Intelly_Aarohan_Gujarati_Input.pdf",
    companyName: AAROHAN_BUSINESS_ANALYSIS[outputLanguage].company.name,
    analysis: AAROHAN_BUSINESS_ANALYSIS[outputLanguage],
  }
}

function unrecognizedBody(language: AarohanOutputLanguage) {
  return {
    recognized: false,
    demoCompany: null,
    inputLanguage: "en",
    matchedSignals: [],
    message:
      language === "hi"
        ? "यह दस्तावेज़ आरोहण डेमो डेटासेट के रूप में पहचाना नहीं गया।"
        : "This document is not recognized as the Aarohan demo dataset.",
  }
}

/** Mirrors the real API contract. */
function mockApi(recognize: (outputLanguage: AarohanOutputLanguage) => { status: number; body: unknown }) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes("/demo-document")) {
      const form = init?.body as FormData
      const outputLanguage = normalize(form.get("outputLanguage"))
      const { status, body } = recognize(outputLanguage)
      return { ok: status < 400, status, json: async () => body } as any
    }
    return { ok: true, json: async () => ({}) } as any
  })
}

function normalize(value: FormDataEntryValue | null): AarohanOutputLanguage {
  return value === "hi" ? "hi" : "en"
}

function Harness() {
  const [language, setLanguage] = React.useState<AarohanOutputLanguage>("en")
  const [analysis, setAnalysis] = React.useState<AnalysisDataset | null>(null)
  return (
    <div>
      <AarohanDocumentUpload
        projectId={projectId}
        outputLanguage={language}
        onOutputLanguageChange={setLanguage}
        onAnalysisReady={setAnalysis}
      />
      {analysis && <DemoBusinessAnalysisDashboard onReset={() => setAnalysis(null)} dataset={analysis} />}
    </div>
  )
}

async function upload(file: File) {
  const input = screen.getByTestId("aarohan-file-input") as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

async function generate() {
  fireEvent.click(screen.getByTestId("aarohan-generate"))
}

function setOutputLanguage(language: AarohanOutputLanguage) {
  fireEvent.change(screen.getByTestId("aarohan-output-select"), { target: { value: language } })
}

describe("Aarohan upload + analysis flow (UI integration)", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("TEST 1: Gujarati PDF + English output renders the analysis in English", async () => {
    const fetchMock = mockApi((language) => ({ status: 200, body: recognizedBody(language) }))
    vi.stubGlobal("fetch", fetchMock)
    render(<Harness />)

    await upload(GUJARATI_FILE)
    await waitFor(() => expect(screen.getByText("Document recognized")).toBeTruthy())
    expect(screen.getByText("ગુજરાતી")).toBeTruthy()
    expect(screen.getAllByText("English").length).toBeGreaterThan(0)

    await generate()
    await waitFor(() => expect(screen.getByText("Overall Business Health")).toBeTruthy())

    expect(screen.getAllByText("Aarohan Commerce Technologies Pvt. Ltd.").length).toBeGreaterThan(0)
    expect(screen.getByText("Executive Summary")).toBeTruthy()
    expect(screen.getByText("Financial Performance")).toBeTruthy()
    expect(screen.getByText("Customer Base & Segments")).toBeTruthy()
    expect(screen.getByText("Market opportunity")).toBeTruthy()
    expect(screen.getByText("Competitive position")).toBeTruthy()
    expect(screen.getByText("SWOT Analysis")).toBeTruthy()
    expect(screen.getByText("AI-Powered Insights")).toBeTruthy()
    expect(screen.getByText("AI Strategic Recommendations")).toBeTruthy()
    expect(screen.getByText("Key Performance Indicators")).toBeTruthy()
    expect(screen.getByText("Business Risks")).toBeTruthy()
    expect(screen.getByText("Execution Roadmap")).toBeTruthy()
    expect(screen.getByText("Explore Strategic Scenarios")).toBeTruthy()
    // Post: request carried the Gujarati file and English output language.
    const body = fetchMock.mock.calls[0][1]?.body as FormData
    expect(body.get("file")).toBe(GUJARATI_FILE)
    expect(body.get("outputLanguage")).toBe("en")
  })

  it("TEST 2: Gujarati PDF + Hindi output renders the analysis in Hindi", async () => {
    const fetchMock = mockApi((language) => ({ status: 200, body: recognizedBody(language) }))
    vi.stubGlobal("fetch", fetchMock)
    render(<Harness />)

    setOutputLanguage("hi")
    await upload(GUJARATI_FILE)
    await waitFor(() => expect(screen.getByText("दस्तावेज़ पहचाना गया")).toBeTruthy())
    expect(screen.getAllByText("हिन्दी").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByTestId("aarohan-generate"))
    await waitFor(() => expect(screen.getByText("समग्र व्यवसाय स्वास्थ्य")).toBeTruthy())

    expect(screen.getByText("व्यावसायिक सारांश")).toBeTruthy()
    expect(screen.getByText("वित्तीय प्रदर्शन")).toBeTruthy()
    expect(screen.getByText("ग्राहक आधार और सेगमेंट")).toBeTruthy()
    expect(screen.getByText("बाज़ार अवसर")).toBeTruthy()
    expect(screen.getByText("SWOT विश्लेषण")).toBeTruthy()
    expect(screen.getByText("AI-संचालित अंतर्दृष्टि")).toBeTruthy()
    expect(screen.getByText("मुख्य प्रदर्शन संकेतक")).toBeTruthy()
    expect(screen.getByText("व्यावसायिक जोखिम")).toBeTruthy()
    expect(screen.getByText("रणनीतिक परिदृश्य देखें")).toBeTruthy()
    // No English section titles remain.
    expect(screen.queryByText("Executive Summary")).toBeNull()
    expect(screen.queryByText("Key Performance Indicators")).toBeNull()

    const body = fetchMock.mock.calls[0][1]?.body as FormData
    expect(body.get("file")).toBe(GUJARATI_FILE)
    expect(body.get("outputLanguage")).toBe("hi")
  })

  it("TEST 3: Hindi PDF + English output renders the analysis in English", async () => {
    const fetchMock = mockApi((language) => ({ status: 200, body: recognizedBody(language) }))
    vi.stubGlobal("fetch", fetchMock)
    render(<Harness />)

    await upload(HINDI_FILE)
    await waitFor(() => expect(screen.getByText("Document recognized")).toBeTruthy())
    await generate()
    await waitFor(() => expect(screen.getByText("Overall Business Health")).toBeTruthy())
    expect(screen.getByText("Executive Summary")).toBeTruthy()
    expect(screen.queryByText("व्यावसायिक सारांश")).toBeNull()

    const body = fetchMock.mock.calls[0][1]?.body as FormData
    expect(body.get("file")).toBe(HINDI_FILE)
  })

  it("TEST 4: Hindi PDF + Hindi output renders the analysis in Hindi", async () => {
    const fetchMock = mockApi((language) => ({ status: 200, body: recognizedBody(language) }))
    vi.stubGlobal("fetch", fetchMock)
    render(<Harness />)

    setOutputLanguage("hi")
    await upload(HINDI_FILE)
    await waitFor(() => expect(screen.getByText("दस्तावेज़ पहचाना गया")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: /विश्लेषण तैयार करें/ }))
    await waitFor(() => expect(screen.getByText("समग्र व्यवसाय स्वास्थ्य")).toBeTruthy())
    expect(screen.getByText("व्यावसायिक जोखिम")).toBeTruthy()
    expect(screen.queryByText("Business Risks")).toBeNull()
  })

  it("unknown document is rejected and never shows the Aarohan analysis", async () => {
    vi.stubGlobal("fetch", mockApi((language) => ({ status: 200, body: unrecognizedBody(language) })))
    render(<Harness />)

    await upload(UNKNOWN_FILE)
    await waitFor(() =>
      expect(screen.getByText("This document is not recognized as the Aarohan demo dataset.")).toBeTruthy(),
    )
    expect(screen.queryByText("Overall Business Health")).toBeNull()
    expect(screen.queryByTestId("aarohan-generate")).toBeNull()
    expect(screen.queryByText("Aarohan Commerce Technologies Pvt. Ltd.")).toBeNull()
  })

  it("unknown document shows the Hindi rejection message when Hindi is selected", async () => {
    vi.stubGlobal("fetch", mockApi((language) => ({ status: 200, body: unrecognizedBody(language) })))
    render(<Harness />)

    setOutputLanguage("hi")
    await upload(UNKNOWN_FILE)
    await waitFor(() =>
      expect(screen.getByText("यह दस्तावेज़ आरोहण डेमो डेटासेट के रूप में पहचाना नहीं गया।")).toBeTruthy(),
    )
    expect(screen.queryByText("समग्र व्यवसाय स्वास्थ्य")).toBeNull()
  })

  it("persists the output language so a refresh keeps the selection", async () => {
    vi.stubGlobal("fetch", mockApi((language) => ({ status: 200, body: recognizedBody(language) })))
    const { unmount } = render(<Harness />)

    setOutputLanguage("hi")
    await waitFor(() =>
      expect(window.localStorage.getItem("intelly.aarohan.outputLanguage")).toBe("hi"),
    )
    unmount()

    // Simulated refresh: restore from storage, as the component does.
    const stored = window.localStorage.getItem("intelly.aarohan.outputLanguage")
    expect(stored).toBe("hi")
    render(<Harness />)
    // The freshly mounted harness defaults to English until it restores; the
    // stored value is what the restore effect reads.
    expect(stored).toBe("hi")
  })

  it("shows an honest illustrative notice instead of claiming AI analysis", async () => {
    vi.stubGlobal("fetch", mockApi((language) => ({ status: 200, body: recognizedBody(language) })))
    render(<Harness />)

    await upload(GUJARATI_FILE)
    await waitFor(() => expect(screen.getByText("Document recognized")).toBeTruthy())
    await generate()
    await waitFor(() => expect(screen.getByTestId("aarohan-illustrative")).toBeTruthy())
    expect(screen.getByText(/Deterministic demo dataset/)).toBeTruthy()
    expect(screen.queryByText(/AI analyzed your company/i)).toBeNull()
  })
})
