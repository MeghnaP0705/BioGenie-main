import { useState, useRef, useEffect } from "react"
import { marked } from 'marked'

const API_BASE = "http://localhost:8000"

const CLASS_LEVELS = ["general", "9", "10", "11", "12"]

function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm w-fit">
            <span className="text-xs text-indigo-400 mr-1">Finding answer from textbook</span>
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </div>
    )
}

export default function DoubtSolver({ onBack }) {
    const [messages, setMessages] = useState([
        {
            from: "bot",
            text: "👋 Hello! I'm your **Doubt Solver**.\n\nAsk me any question from your Biotechnology textbook and I'll answer it strictly from the official uploaded content.\n\n_Select your class level on the right before asking._",
        },
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [classLevel, setClassLevel] = useState("general")
    const [backendReady, setBackendReady] = useState(null)
    const [indexReady, setIndexReady] = useState(false)
    const chatEndRef = useRef(null)
    const inputRef = useRef(null)

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

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, loading])

    const sendQuestion = async (question) => {
        if (!question.trim() || loading) return

        setMessages(prev => [...prev, { from: "user", text: question }])
        setInput("")
        setLoading(true)

        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, class_level: classLevel }),
            })

            const data = await res.json()
            const answer = res.ok
                ? data.answer
                : (data.detail || "An error occurred. Please try again.")

            setMessages(prev => [...prev, { from: "bot", text: answer, sources: data.sources || [] }])
        } catch {
            setMessages(prev => [
                ...prev,
                { from: "bot", text: "❌ Cannot reach the BioGenie server. Please ensure the backend is running on port 8000.", sources: [] },
            ])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendQuestion(input)
        }
    }

    const statusColor = backendReady === null
        ? "bg-gray-100 text-gray-500"
        : backendReady
            ? (indexReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")
            : "bg-red-100 text-red-600"

    const dotColor = backendReady === null
        ? "bg-gray-400"
        : backendReady
            ? (indexReady ? "bg-emerald-500 animate-pulse" : "bg-amber-400")
            : "bg-red-400"

    const statusText = backendReady === null
        ? "Connecting..."
        : backendReady
            ? (indexReady ? "Textbook Index Ready" : "No Textbook Indexed")
            : "Server Offline"

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex flex-col">

            {/* ─ Header ─ */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="text-sm text-gray-500 hover:text-indigo-700 transition flex items-center gap-1"
                    >
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-indigo-800">Doubt Solver</h1>
                        <p className="text-xs text-gray-500">Answers strictly from your uploaded Biotechnology textbooks</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Class level selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-600">Class:</label>
                        <select
                            value={classLevel}
                            onChange={e => setClassLevel(e.target.value)}
                            className="text-sm border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-indigo-700 font-medium"
                        >
                            {CLASS_LEVELS.map(l => (
                                <option key={l} value={l}>
                                    {l === "general" ? "All Classes" : `Class ${l}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status badge */}
                    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        {statusText}
                    </div>
                </div>
            </header>

            {/* ─ Chat Panel ─ */}
            <div className="flex flex-1 overflow-hidden p-4 md:p-6">
                <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.from === "bot" && (
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                                        ?
                                    </div>
                                )}
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm flex flex-col ${msg.from === "user"
                                    ? "bg-indigo-600 text-white rounded-tr-sm text-sm"
                                    : "bg-gray-50 border border-gray-100 rounded-tl-sm"
                                    }`}>
                                    {msg.from === "bot" ? (
                                        <>
                                            <div
                                                className="text-sm text-gray-800 prose prose-sm max-w-none leading-relaxed [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>h3]:text-indigo-800 [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1 [&>p>strong]:text-indigo-900"
                                                dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                                            />
                                            {/* Source citations */}
                                            {msg.sources && msg.sources.length > 0 && (
                                                <div className="mt-3 pt-2 border-t border-gray-200">
                                                    <p className="text-xs font-semibold text-indigo-600 mb-1">📚 Sources from textbook:</p>
                                                    <ul className="space-y-0.5">
                                                        {msg.sources.map((src, si) => (
                                                            <li key={si} className="text-xs text-gray-500 italic">• {src}</li>
                                                        ))}
                                                    </ul>
                                                </div>
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
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                                    ?
                                </div>
                                <TypingIndicator />
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Input bar */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        {/* Quick suggestion chips */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {["What is genetic engineering?", "Explain PCR process", "What is CRISPR?"].map(suggestion => (
                                <button
                                    key={suggestion}
                                    onClick={() => sendQuestion(suggestion)}
                                    disabled={loading}
                                    className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-40"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                rows={2}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask your doubt from the textbook... (e.g. What is recombinant DNA?)"
                                className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 placeholder-gray-400"
                            />
                            <button
                                onClick={() => sendQuestion(input)}
                                disabled={!input.trim() || loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 font-medium text-sm"
                            >
                                Ask
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 ml-1">Press Enter to send · Shift+Enter for new line</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
