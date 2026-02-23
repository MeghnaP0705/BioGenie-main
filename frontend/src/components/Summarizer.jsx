import { useState, useRef, useEffect } from "react"
import { marked } from 'marked'

const API_BASE = "http://localhost:8000"

// ─── PDF export via print ──────────────────────────────────────────────────────
function downloadNotesPDF(notes) {
    const win = window.open("", "_blank")
    win.document.write(`
    <html>
      <head>
        <title>BioGenie - Summarized Notes</title>
        <style>
          body { font-family: Georgia, serif; max-width: 750px; margin: 40px auto; color: #1a1a1a; line-height: 1.7; }
          h1 { color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 8px; }
          .section-label { display: inline-block; background: #d1fae5; color: #065f46;
            font-size: 11px; font-weight: bold; text-transform: uppercase;
            letter-spacing: 0.08em; padding: 2px 8px; border-radius: 4px; margin-top: 16px; }
          .bullet { margin-left: 20px; }
          .not-found { background: #fef3c7; border: 1px solid #fcd34d;
            padding: 10px 16px; border-radius: 6px; color: #92400e; }
          p { margin: 8px 0; font-size: 14px; }
          ul { margin-top: 4px; margin-bottom: 12px; padding-left: 20px; }
          li { margin-bottom: 4px; font-size: 14px; }
          strong { color: #065f46; }
          @media print { body { margin: 20mm; } }
        </style>
      </head>
      <body>
        <h1>BioGenie – Summarized Notes</h1>
        <div style="font-family: Georgia, serif; font-size:14px;">
           ${marked.parse(notes)}
        </div>
      </body>
    </html>
  `)
    win.document.close()
    win.focus()
    win.print()
}

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm w-fit mt-4 mx-auto">
            <span className="text-xs text-emerald-800 mr-1 font-medium">Analyzing against Textbook Syllabus</span>
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </div>
    )
}

export default function Summarizer({ onBack }) {
    const [inputText, setInputText] = useState("")
    const [selectedFile, setSelectedFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState(null)
    const [errorMsg, setErrorMsg] = useState(null)

    const fileInputRef = useRef(null)

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file && file.type === "application/pdf") {
            setSelectedFile(file)
            setErrorMsg(null)
        } else if (file) {
            setErrorMsg("Please select a valid PDF file.")
        }
    }

    const removeFile = () => {
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const handleSummarize = async () => {
        if (!inputText.trim() && !selectedFile) {
            setErrorMsg("Please provide text or upload a PDF to summarize.")
            return
        }

        setLoading(true)
        setSummary(null)
        setErrorMsg(null)

        const formData = new FormData()
        if (inputText.trim()) {
            formData.append("text", inputText)
        }
        if (selectedFile) {
            formData.append("file", selectedFile)
        }

        try {
            const res = await fetch(`${API_BASE}/summarize`, {
                method: "POST",
                body: formData,
            })

            const data = await res.json()
            if (res.ok) {
                setSummary(data.summary)
            } else {
                setErrorMsg(data.detail || "An error occurred during summarization.")
            }
        } catch (err) {
            setErrorMsg("Cannot connect to server. Please ensure the backend is running.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex flex-col">
            <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-sm text-gray-500 hover:text-emerald-700 transition flex items-center gap-1">
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-emerald-800">Verified Summarizer</h1>
                        <p className="text-xs text-gray-500">Paste notes or upload a PDF. Output checked strictly against Class 9-12 Syllabus.</p>
                    </div>
                </div>
            </header>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-4 md:p-6 gap-6">

                {/* ─ LEFT: Input Panel ─ */}
                <div className="w-full md:w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 gap-4">
                    <h2 className="text-lg font-semibold text-emerald-800">Provide Notes</h2>

                    <textarea
                        className="flex-1 w-full resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50 placeholder-gray-400"
                        placeholder="Paste your notes here to be summarized..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />

                    <div className="flex flex-col gap-2">
                        <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />

                        {!selectedFile ? (
                            <button
                                onClick={() => fileInputRef.current.click()}
                                className="w-full py-4 border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-xl text-emerald-700 font-medium text-sm transition bg-emerald-50/50 flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-xl">📄</span>
                                <span>Or Upload a PDF Document</span>
                            </button>
                        ) : (
                            <div className="w-full py-3 px-4 border border-emerald-300 rounded-xl bg-emerald-50 flex items-center justify-between">
                                <span className="text-sm text-emerald-800 font-medium truncate max-w-[80%]">📄 {selectedFile.name}</span>
                                <button onClick={removeFile} className="text-xs text-red-500 hover:text-red-700 font-bold">✕ Remove</button>
                            </div>
                        )}
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {errorMsg}
                        </div>
                    )}

                    <button
                        onClick={handleSummarize}
                        disabled={loading || (!inputText.trim() && !selectedFile)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-3.5 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm text-sm"
                    >
                        {loading ? "Verifying Context & Summarizing..." : "Summarize Notes"}
                    </button>
                </div>

                {/* ─ RIGHT: Output Panel ─ */}
                <div className="w-full md:w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-gray-800 text-sm">Summary Output</h2>
                            <p className="text-xs text-emerald-600 font-medium">Verified against Syllabus</p>
                        </div>
                        {summary && !summary.includes("Cannot summarize") && (
                            <button
                                onClick={() => downloadNotesPDF(summary)}
                                className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
                            >
                                <span>⬇</span> Download Note
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <TypingIndicator />
                            </div>
                        ) : summary ? (
                            <div className={`prose prose-sm max-w-none leading-relaxed
                                ${summary.includes("Cannot summarize") ? "text-red-700 bg-red-50 p-6 rounded-xl border border-red-100" : "text-gray-800 prose-emerald [&>ul]:list-disc [&>ul]:ml-4 [&>h3]:text-emerald-800 [&>h3]:mt-4 [&>p>strong]:text-emerald-900"}
                            `}
                                dangerouslySetInnerHTML={{ __html: marked.parse(summary) }}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl opacity-70">
                                    ✂️
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">No output generated yet</p>
                                    <p className="text-xs mt-1">Paste your notes or upload a PDF on the left</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
