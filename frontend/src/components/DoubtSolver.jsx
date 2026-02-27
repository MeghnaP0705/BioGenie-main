import { useState, useRef, useEffect } from "react"
import { marked } from 'marked'
import ChatHistorySidebar, { saveSession, loadSession } from "./ChatHistorySidebar"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"
const CLASS_LEVELS = ["general", "9", "10", "11", "12"]

const WELCOME_MSG = {
    from: "bot",
    text: "👋 Hello! I'm your **Doubt Solver**.\n\nAsk me any question from your Biotechnology textbook and I'll answer it strictly from the official uploaded content.\n\n_Select your class level on the right before asking._",
}

function TypingIndicator() {
    return (
        <div className="typing-indicator">
            <span className="text-xs text-emerald-400 mr-1">Finding answer from textbook</span>
            {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
        </div>
    )
}

export default function DoubtSolver({ onBack, isAuthenticated, userId }) {
    const [messages, setMessages] = useState([WELCOME_MSG])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [classLevel, setClassLevel] = useState("general")
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
        const newId = saveSession({ userId, feature: "doubt", title, messages: updatedMessages, sessionId: existingSessionId })
        if (newId && !existingSessionId) window.dispatchEvent(new Event("refresh-sidebar-doubt"))
        return newId
    }

    const sendQuestion = async (question) => {
        if (!question.trim() || loading) return
        const newMessages = [...messages, { from: "user", text: question }]
        setMessages(newMessages)
        setInput("")
        setLoading(true)

        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, class_level: classLevel }),
            })
            const data = await res.json()
            const answer = res.ok ? data.answer : (data.detail || "An error occurred.")
            const allMessages = [...newMessages, { from: "bot", text: answer, sources: data.sources || [] }]
            setMessages(allMessages)
            const newId = persistChat(allMessages, sessionId)
            if (newId) setSessionId(newId)
            window.dispatchEvent(new Event("refresh-sidebar-doubt"))
        } catch {
            setMessages(prev => [...prev, { from: "bot", text: "❌ Cannot reach the BioGenie server.", sources: [] }])
        } finally { setLoading(false); inputRef.current?.focus() }
    }

    const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuestion(input) } }

    const handleSelectSession = (session) => {
        const loaded = loadSession(session.id)
        if (loaded) { setMessages(loaded.messages); setSessionId(loaded.id) }
    }

    const handleNewChat = () => {
        if (messages.some(m => m.from === "user") && isAuthenticated) {
            persistChat(messages, sessionId)
            window.dispatchEvent(new Event("refresh-sidebar-doubt"))
        }
        setMessages([WELCOME_MSG])
        setSessionId(null)
        setInput("")
    }

    const statusClass = backendReady === null ? "status-badge loading" : backendReady ? (indexReady ? "status-badge online" : "status-badge warning") : "status-badge offline"
    const dotClass = backendReady === null ? "bg-slate-400" : backendReady ? (indexReady ? "bg-emerald-400 animate-pulse" : "bg-amber-400") : "bg-red-400"
    const statusText = backendReady === null ? "Connecting..." : backendReady ? (indexReady ? "Textbook Index Ready" : "No Textbook Indexed") : "Server Offline"

    return (
        <div className="page-dark flex flex-col">
            <header className="feature-header flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-emerald-400 transition flex items-center gap-1">← Back</button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Doubt Solver</h1>
                        <p className="text-xs text-slate-500">Answers strictly from your uploaded Biotechnology textbooks</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-500">Class:</label>
                        <select value={classLevel} onChange={e => setClassLevel(e.target.value)}
                            className="text-sm border border-emerald-500/20 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-[#0c1a2e] text-emerald-400 font-medium">
                            {CLASS_LEVELS.map(l => (<option key={l} value={l}>{l === "general" ? "All Classes" : `Class ${l}`}</option>))}
                        </select>
                    </div>
                    <div className={statusClass}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                        {statusText}
                    </div>
                </div>
            </header>

            <div className="feature-with-sidebar">
                <ChatHistorySidebar isAuthenticated={isAuthenticated} userId={userId} feature="doubt"
                    activeSessionId={sessionId} onSelectSession={handleSelectSession} onNewChat={handleNewChat} />

                <div className="flex flex-1 overflow-hidden p-4 md:p-6">
                    <div className="flex flex-col flex-1 feature-panel overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                                    {msg.from === "bot" && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[#060d18] text-xs font-bold mr-2 flex-shrink-0 mt-0.5">?</div>
                                    )}
                                    <div className={msg.from === "user" ? "chat-bubble-user" : "chat-bubble-bot"}>
                                        {msg.from === "bot" ? (
                                            <>
                                                <div className="text-sm prose-dark prose prose-sm max-w-none leading-relaxed [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4"
                                                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }} />
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="mt-3 pt-2 border-t border-emerald-500/15">
                                                        <p className="text-xs font-semibold text-emerald-400 mb-1">📚 Sources:</p>
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
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[#060d18] text-xs font-bold mr-2 flex-shrink-0">?</div>
                                    <TypingIndicator />
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 border-t border-emerald-500/10">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {["What is genetic engineering?", "Explain PCR process", "What is CRISPR?"].map(s => (
                                    <button key={s} onClick={() => sendQuestion(s)} disabled={loading}
                                        className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-40">{s}</button>
                                ))}
                            </div>
                            <div className="flex items-end gap-2">
                                <textarea ref={inputRef} rows={2} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                                    placeholder="Ask your doubt from the textbook..." className="flex-1 resize-none inp rounded-xl" />
                                <button onClick={() => sendQuestion(input)} disabled={!input.trim() || loading}
                                    className="btn-teal rounded-xl px-5 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 text-sm">Ask</button>
                            </div>
                            <p className="text-xs text-slate-600 mt-1.5 ml-1">Press Enter to send · Shift+Enter for new line</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
