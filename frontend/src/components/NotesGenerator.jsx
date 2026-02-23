import { useState, useRef, useEffect } from "react"
import { marked } from 'marked'

const API_BASE = "http://localhost:8000"



// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm w-fit">
            <span className="text-xs text-gray-400 mr-1">BioGenie is thinking</span>
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

// ─── PDF export via print ──────────────────────────────────────────────────────
function downloadNotesPDF(notes) {
    const win = window.open("", "_blank")
    win.document.write(`
    <html>
      <head>
        <title>BioGenie Notes</title>
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
        <h1>BioGenie – Biotechnology Notes</h1>
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

// ─── Main NotesGenerator Component (Chat-only, no uploads) ─────────────────────
export default function NotesGenerator({ onBack }) {
    const [messages, setMessages] = useState([
        {
            from: "bot",
            text: "Welcome to BioGenie – Biotechnology Notes Generator.\n\nAsk any topic from your Class 9–12 Biotechnology syllabus and I will generate structured, exam-ready notes strictly from the official Biotechnology textbook notes.\n\nNo external knowledge is used. All answers come from pre-indexed PDF content only.",
        },
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [backendReady, setBackendReady] = useState(null)
    const [indexReady, setIndexReady] = useState(false)
    const chatEndRef = useRef(null)
    const inputRef = useRef(null)

    // Check backend health on mount
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch(`${API_BASE}/health`)
                if (res.ok) {
                    const data = await res.json()
                    setBackendReady(true)
                    setIndexReady(data.index_ready)
                } else {
                    setBackendReady(false)
                }
            } catch {
                setBackendReady(false)
            }
        }
        checkHealth()
    }, [])

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, loading])

    const sendQuestion = async (question) => {
        if (!question.trim() || loading) return

        const userMsg = { from: "user", text: question }
        setMessages(prev => [...prev, userMsg])
        setInput("")
        setLoading(true)

        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, class_level: "general" }),
            })

            const data = await res.json()
            const answer = res.ok ? data.answer : (data.detail || "An error occurred. Please try again.")
            const botMsg = { from: "bot", text: answer }

            setMessages(prev => [...prev, botMsg])
        } catch {
            setMessages(prev => [
                ...prev,
                { from: "bot", text: "Cannot reach the BioGenie server. Please ensure the backend is running on port 8000." },
            ])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleSend = () => sendQuestion(input)

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex flex-col">

            {/* ─ Header ─ */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="text-sm text-gray-500 hover:text-emerald-700 transition flex items-center gap-1"
                    >
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-emerald-800">Biotechnology Notes Generator</h1>
                        <p className="text-xs text-gray-500">Class 9–12 Syllabus · Official Textbook Notes Only</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Backend status badge */}
                    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${backendReady === null ? "bg-gray-100 text-gray-500" :
                        backendReady ? (indexReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")
                            : "bg-red-100 text-red-600"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${backendReady === null ? "bg-gray-400" :
                            backendReady ? (indexReady ? "bg-emerald-500 animate-pulse" : "bg-amber-400") : "bg-red-400"
                            }`} />
                        {backendReady === null ? "Connecting..." :
                            backendReady ? (indexReady ? "Knowledge Base Ready" : "No Notes Indexed") : "Server Offline"}
                    </div>
                    {/* Download Full Notes Button */}
                    <button
                        onClick={() => {
                            const fullHistory = messages
                                .filter(m => m.from === "bot")
                                .map(m => m.text)
                                .join("\n\n-----------------\n\n")
                            if (fullHistory.trim()) {
                                downloadNotesPDF(fullHistory)
                            } else {
                                alert("No generated notes to download yet!")
                            }
                        }}
                        className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition shadow-sm ml-4"
                    >
                        ⬇ Download Full Session Notes
                    </button>
                </div>
            </header>

            {/* ─ Main Content: Chat (left) + Notes Preview (right) ─ */}
            <div className="flex flex-1 overflow-hidden gap-4 p-4 md:p-6">

                {/* ─ LEFT: Chat Panel ─ */}
                <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Chat history */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.from === "bot" && (
                                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                                        B
                                    </div>
                                )}
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm flex flex-col ${msg.from === "user"
                                    ? "bg-emerald-600 text-white rounded-tr-sm text-sm"
                                    : "bg-gray-50 border border-gray-100 rounded-tl-sm"
                                    }`}>
                                    {msg.from === "bot" ? (
                                        <>
                                            <div
                                                className="flex-1 text-sm text-gray-800 prose prose-sm prose-emerald max-w-none space-y-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>h3]:text-emerald-800 [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1 [&>p>strong]:text-emerald-900 leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                                            />
                                            {/* Inject download single note button directly under the bot's response */}
                                            {i > 0 && (
                                                <button
                                                    onClick={() => downloadNotesPDF(msg.text)}
                                                    className="self-start mt-3 flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-800 font-medium px-2.5 py-1.5 rounded-md hover:bg-emerald-200 transition"
                                                >
                                                    <span>⬇</span> Download this note
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-sm">{msg.text}</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                                    B
                                </div>
                                <TypingIndicator />
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Input bar */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                rows={2}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask from your Biotechnology notes... (e.g. Explain Genetic Engineering)"
                                className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50 placeholder-gray-400"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 font-medium text-sm"
                            >
                                Send
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 ml-1">Press Enter to send · Shift+Enter for new line</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
