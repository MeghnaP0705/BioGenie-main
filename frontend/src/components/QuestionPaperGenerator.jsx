import { useState, useRef, useEffect } from "react"
import { marked } from 'marked'
import ChatHistorySidebar, { saveSession, loadSession } from "./ChatHistorySidebar"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"
const CLASS_LEVELS = ["general", "9", "10", "11", "12"]
const MARKS_OPTIONS = [1, 2, 5, 10]
const NUM_QUESTIONS_OPTIONS = [5, 10, 15, 20, 25]

const WELCOME_MSG = {
    from: "bot",
    text: "👋 Hello! I'm your **Question Paper Generator**.\n\nEnter a topic and I'll generate exam-style questions directly from your textbook content.\n\n**Configure on the right:**\n- 📚 **Class level** — Select the class\n- 🔢 **Marks** — 1 (MCQ), 2 (Short), 5 (Descriptive), 10 (Essay)\n- 📝 **Count** — Number of questions to generate\n\n_Example: \"Tissues\" or \"Generate questions on DNA Replication\"_",
}

function TypingIndicator() {
    return (
        <div className="typing-indicator">
            <span className="text-xs text-lime-400 mr-1">Generating questions from textbook</span>
            {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-lime-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
        </div>
    )
}

export default function QuestionPaperGenerator({ onBack, isAuthenticated, userId }) {
    const [messages, setMessages] = useState([WELCOME_MSG])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [classLevel, setClassLevel] = useState("general")
    const [marks, setMarks] = useState(2)
    const [numQ, setNumQ] = useState(10)
    const [backendReady, setBackendReady] = useState(null)
    const [indexReady, setIndexReady] = useState(false)
    const [sessionId, setSessionId] = useState(null)
    const chatEndRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 3;

        const checkHealth = async () => {
            try {
                const res = await fetch(`${API_BASE}/health`)
                if (res.ok) {
                    const data = await res.json()
                    setBackendReady(true)
                    setIndexReady(data.index_ready)
                } else {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(checkHealth, 1000);
                    } else {
                        setBackendReady(false)
                    }
                }
            } catch {
                if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(checkHealth, 1000);
                } else {
                    setBackendReady(false)
                }
            }
        }
        checkHealth()
    }, [])

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading])

    const persistChat = (updatedMessages, existingSessionId) => {
        if (!isAuthenticated || !userId) return null
        const userMsgs = updatedMessages.filter(m => m.from === "user")
        if (userMsgs.length === 0) return existingSessionId
        const title = userMsgs[0].text.slice(0, 60) + (userMsgs[0].text.length > 60 ? "…" : "")
        const newId = saveSession({ userId, feature: "questionpaper", title, messages: updatedMessages, sessionId: existingSessionId })
        if (newId && !existingSessionId) window.dispatchEvent(new Event("refresh-sidebar-questionpaper"))
        return newId
    }

    const generateQuestions = async (prompt) => {
        if (!prompt.trim() || loading) return
        const label = `${prompt} [${marks}-mark × ${numQ}]`
        const newMessages = [...messages, { from: "user", text: label }]
        setMessages(newMessages)
        setInput("")
        setLoading(true)

        try {
            const res = await fetch(`${API_BASE}/generate-question-paper`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: prompt,
                    class_level: classLevel,
                    marks_per_question: marks,
                    num_questions: numQ,
                }),
            })
            const data = await res.json()
            const result = res.ok ? data.questions : (data.detail || "An error occurred.")
            const allMessages = [...newMessages, { from: "bot", text: result, sources: data.sources || [] }]
            setMessages(allMessages)
            const newId = persistChat(allMessages, sessionId)
            if (newId) setSessionId(newId)
            window.dispatchEvent(new Event("refresh-sidebar-questionpaper"))
        } catch {
            setMessages(prev => [...prev, { from: "bot", text: "❌ Cannot reach the BioGenie server.", sources: [] }])
        } finally { setLoading(false); inputRef.current?.focus() }
    }

    const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateQuestions(input) } }

    const handleSelectSession = (session) => {
        const loaded = loadSession(session.id)
        if (loaded) { setMessages(loaded.messages); setSessionId(loaded.id) }
    }

    const handleNewChat = () => {
        if (messages.some(m => m.from === "user") && isAuthenticated) {
            persistChat(messages, sessionId)
            window.dispatchEvent(new Event("refresh-sidebar-questionpaper"))
        }
        setMessages([WELCOME_MSG])
        setSessionId(null)
        setInput("")
    }

    const statusClass = backendReady === null ? "status-badge loading" : backendReady ? (indexReady ? "status-badge online" : "status-badge warning") : "status-badge offline"
    const dotClass = backendReady === null ? "bg-slate-400" : backendReady ? (indexReady ? "bg-lime-400 animate-pulse" : "bg-amber-400") : "bg-red-400"
    const statusText = backendReady === null ? "Connecting..." : backendReady ? (indexReady ? "Textbook Index Ready" : "No Textbook Indexed") : "Server Offline"

    const marksLabel = { 1: "1 Mark (MCQ)", 2: "2 Marks (Short)", 5: "5 Marks (Descriptive)", 10: "10 Marks (Essay)" }

    return (
        <div className="page-dark flex flex-col">
            <header className="feature-header flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-lime-400 transition flex items-center gap-1">← Back</button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">📝 Question Paper Generator</h1>
                        <p className="text-xs text-slate-500">Generate exam questions from your textbooks</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-500">Class:</label>
                        <select value={classLevel} onChange={e => setClassLevel(e.target.value)}
                            className="text-sm border border-lime-500/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-lime-500/30 bg-[#0c1a2e] text-lime-400 font-medium">
                            {CLASS_LEVELS.map(l => (<option key={l} value={l}>{l === "general" ? "All Classes" : `Class ${l}`}</option>))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-500">Marks:</label>
                        <select value={marks} onChange={e => setMarks(Number(e.target.value))}
                            className="text-sm border border-lime-500/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-lime-500/30 bg-[#0c1a2e] text-lime-400 font-medium">
                            {MARKS_OPTIONS.map(m => (<option key={m} value={m}>{marksLabel[m]}</option>))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-500">Count:</label>
                        <select value={numQ} onChange={e => setNumQ(Number(e.target.value))}
                            className="text-sm border border-lime-500/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-lime-500/30 bg-[#0c1a2e] text-lime-400 font-medium">
                            {NUM_QUESTIONS_OPTIONS.map(n => (<option key={n} value={n}>{n} questions</option>))}
                        </select>
                    </div>
                    <div className={statusClass}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                        {statusText}
                    </div>
                </div>
            </header>

            <div className="feature-with-sidebar">
                <ChatHistorySidebar isAuthenticated={isAuthenticated} userId={userId} feature="questionpaper"
                    activeSessionId={sessionId} onSelectSession={handleSelectSession} onNewChat={handleNewChat} />

                <div className="flex flex-1 overflow-hidden p-4 md:p-6">
                    <div className="flex flex-col flex-1 feature-panel overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                                    {msg.from === "bot" && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center text-[#060d18] text-xs font-bold mr-2 flex-shrink-0 mt-0.5">📝</div>
                                    )}
                                    <div className={msg.from === "user" ? "chat-bubble-user" : "chat-bubble-bot"}>
                                        {msg.from === "bot" ? (
                                            <>
                                                <div className="text-sm prose-dark prose prose-sm max-w-none leading-relaxed [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>h2]:text-lime-400 [&>h3]:text-lime-300"
                                                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }} />
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="mt-3 pt-2 border-t border-lime-500/15">
                                                        <p className="text-xs font-semibold text-lime-400 mb-1">📚 Sources:</p>
                                                        <ul className="space-y-0.5">
                                                            {msg.sources.map((src, si) => (<li key={si} className="text-xs text-slate-500 italic">• {src}</li>))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </>
                                        ) : (<span className="text-sm">{msg.text}</span>)}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center text-[#060d18] text-xs font-bold mr-2 flex-shrink-0">📝</div>
                                    <TypingIndicator />
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 border-t border-lime-500/10">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {["Tissues", "DNA Replication", "Genetic Engineering", "PCR", "Biotechnology Principles"].map(s => (
                                    <button key={s} onClick={() => generateQuestions(s)} disabled={loading}
                                        className="text-xs px-3 py-1.5 rounded-full border border-lime-500/20 text-lime-400 hover:bg-lime-500/10 transition disabled:opacity-40">{s}</button>
                                ))}
                            </div>
                            <div className="flex items-end gap-2">
                                <textarea ref={inputRef} rows={2} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                                    placeholder="Enter a topic to generate questions... e.g., 'Tissues' or 'PCR'" className="flex-1 resize-none inp rounded-xl" />
                                <button onClick={() => generateQuestions(input)} disabled={!input.trim() || loading}
                                    className="btn-teal rounded-xl px-5 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 text-sm">Generate</button>
                            </div>
                            <p className="text-xs text-slate-600 mt-1.5 ml-1">Press Enter to send · {marksLabel[marks]} · {numQ} questions</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
