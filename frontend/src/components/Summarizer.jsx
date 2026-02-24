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
        <div className="typing-indicator mx-auto mt-4">
            <span className="text-xs text-emerald-400 mr-1 font-medium">Analyzing against Textbook Syllabus</span>
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
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
        <div className="page-dark flex flex-col">
            <header className="feature-header flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-emerald-400 transition flex items-center gap-1">
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Verified Summarizer</h1>
                        <p className="text-xs text-slate-500">Paste notes or upload a PDF. Output checked strictly against Class 9-12 Syllabus.</p>
                    </div>
                </div>
            </header>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-4 md:p-6 gap-6">

                {/* ─ LEFT: Input Panel ─ */}
                <div className="w-full md:w-1/2 flex flex-col feature-panel overflow-hidden p-6 gap-4">
                    <h2 className="text-lg font-semibold text-emerald-400">Provide Notes</h2>

                    <textarea
                        className="flex-1 w-full resize-none inp rounded-xl"
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
                                className="w-full py-4 border-2 border-dashed border-emerald-500/25 hover:border-emerald-500/50 rounded-xl text-emerald-400 font-medium text-sm transition bg-emerald-500/5 flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-xl">📄</span>
                                <span>Or Upload a PDF Document</span>
                            </button>
                        ) : (
                            <div className="w-full py-3 px-4 border border-emerald-500/30 rounded-xl bg-emerald-500/10 flex items-center justify-between">
                                <span className="text-sm text-emerald-300 font-medium truncate max-w-[80%]">📄 {selectedFile.name}</span>
                                <button onClick={removeFile} className="text-xs text-red-400 hover:text-red-300 font-bold">✕ Remove</button>
                            </div>
                        )}
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {errorMsg}
                        </div>
                    )}

                    <button
                        onClick={handleSummarize}
                        disabled={loading || (!inputText.trim() && !selectedFile)}
                        className="w-full btn-teal rounded-xl px-5 py-3.5 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {loading ? "Verifying Context & Summarizing..." : "Summarize Notes"}
                    </button>
                </div>

                {/* ─ RIGHT: Output Panel ─ */}
                <div className="w-full md:w-1/2 flex flex-col feature-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-emerald-500/10 flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-200 text-sm">Summary Output</h2>
                            <p className="text-xs text-emerald-400 font-medium">Verified against Syllabus</p>
                        </div>
                        {summary && !summary.includes("Cannot summarize") && (
                            <button
                                onClick={() => downloadNotesPDF(summary)}
                                className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition shadow-sm shadow-emerald-500/20"
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
                            <div className={`prose prose-sm max-w-none leading-relaxed prose-dark
                                ${summary.includes("Cannot summarize") ? "text-red-400 bg-red-500/10 p-6 rounded-xl border border-red-500/15" : "[&>ul]:list-disc [&>ul]:ml-4 [&>h3]:mt-4"}`}
                                dangerouslySetInnerHTML={{ __html: marked.parse(summary) }}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-3xl opacity-70">
                                    ✂️
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">No output generated yet</p>
                                    <p className="text-xs mt-1 text-slate-600">Paste your notes or upload a PDF on the left</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
