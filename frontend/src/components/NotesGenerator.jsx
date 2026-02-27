import { useState, useRef, useEffect } from "react"
import { marked } from 'marked'
import ChatHistorySidebar, { saveSession, loadSession } from "./ChatHistorySidebar"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

const WELCOME_MSG = {
    from: "bot",
    text: "Welcome to BioGenie – Biotechnology Notes Generator.\n\nAsk any topic from your Class 9–12 Biotechnology syllabus and I will generate structured, exam-ready notes strictly from the official Biotechnology textbook notes.\n\nNo external knowledge is used. All answers come from pre-indexed PDF content only.",
}

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="typing-indicator">
            <span className="text-xs text-emerald-400 mr-1">BioGenie is thinking</span>
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

// ─── Main Component ─────────────────────────────────────────────────────────
export default function NotesGenerator({ onBack, isAuthenticated, userId }) {
    const [messages, setMessages] = useState([WELCOME_MSG])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [backendReady, setBackendReady] = useState(null)
    const [indexReady, setIndexReady] = useState(false)
    const [sessionId, setSessionId] = useState(null)
    const chatEndRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 60;

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

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, loading])

    // ─── Save current chat to localStorage ───
    const persistChat = (updatedMessages, existingSessionId) => {
        if (!isAuthenticated || !userId) return null
        const userMsgs = updatedMessages.filter(m => m.from === "user")
        if (userMsgs.length === 0) return existingSessionId
        const title = userMsgs[0].text.slice(0, 60) + (userMsgs[0].text.length > 60 ? "…" : "")
        const newId = saveSession({
            userId,
            feature: "notes",
            title,
            messages: updatedMessages,
            sessionId: existingSessionId,
        })
        if (newId && !existingSessionId) {
            window.dispatchEvent(new Event("refresh-sidebar-notes"))
        }
        return newId
    }

    const sendQuestion = async (question) => {
        if (!question.trim() || loading) return

        const userMsg = { from: "user", text: question }
        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInput("")
        setLoading(true)

        try {
            const res = await fetch(`${API_BASE}/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, class_level: "general" }),
            })
            const data = await res.json()
            const answer = res.ok ? data.answer : (data.detail || "An error occurred.")
            const allMessages = [...newMessages, { from: "bot", text: answer }]
            setMessages(allMessages)

            // Auto-save & update sidebar
            const newId = persistChat(allMessages, sessionId)
            if (newId) setSessionId(newId)
            window.dispatchEvent(new Event("refresh-sidebar-notes"))
        } catch {
            setMessages(prev => [...prev, { from: "bot", text: "Cannot reach the BioGenie server. Please ensure the backend is running on port 8000." }])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleSend = () => sendQuestion(input)
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    // ─── Sidebar: load a past session ───
    const handleSelectSession = (session) => {
        const loaded = loadSession(session.id)
        if (loaded) {
            setMessages(loaded.messages)
            setSessionId(loaded.id)
        }
    }

    // ─── Sidebar: New Chat — save current, then clear ───
    const handleNewChat = () => {
        // Save current chat first if it has user messages
        if (messages.some(m => m.from === "user") && isAuthenticated) {
            persistChat(messages, sessionId)
            window.dispatchEvent(new Event("refresh-sidebar-notes"))
        }
        setMessages([WELCOME_MSG])
        setSessionId(null)
        setInput("")
    }

    const statusClass = backendReady === null ? "status-badge loading" :
        backendReady ? (indexReady ? "status-badge online" : "status-badge warning") : "status-badge offline"
    const dotClass = backendReady === null ? "bg-slate-400" :
        backendReady ? (indexReady ? "bg-emerald-400 animate-pulse" : "bg-amber-400") : "bg-red-400"
    const statusText = backendReady === null ? "Waking up server..." :
        backendReady ? (indexReady ? "Knowledge Base Ready" : "No Notes Indexed") : "Server Offline"

    return (
        <div className="page-dark flex flex-col">
            <header className="feature-header flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-emerald-400 transition flex items-center gap-1">
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Biotechnology Notes Generator</h1>
                        <p className="text-xs text-slate-500">Class 9–12 Syllabus · Official Textbook Notes Only</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={statusClass}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                        {statusText}
                    </div>
                    <button
                        onClick={() => {
                            const fullHistory = messages.filter(m => m.from === "bot").map(m => m.text).join("\n\n---\n\n")
                            if (fullHistory.trim()) downloadNotesPDF(fullHistory)
                            else alert("No generated notes to download yet!")
                        }}
                        className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition shadow-sm shadow-emerald-500/20 ml-4"
                    >
                        ⬇ Download Notes
                    </button>
                </div>
            </header>

            <div className="feature-with-sidebar">
                <ChatHistorySidebar
                    isAuthenticated={isAuthenticated}
                    userId={userId}
                    feature="notes"
                    activeSessionId={sessionId}
                    onSelectSession={handleSelectSession}
                    onNewChat={handleNewChat}
                />

                <div className="flex flex-1 overflow-hidden gap-4 p-4 md:p-6">
                    <div className="flex flex-col flex-1 feature-panel overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                                    {msg.from === "bot" && (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[#060d18] text-xs font-bold mr-2 flex-shrink-0 mt-0.5">B</div>
                                    )}
                                    <div className={msg.from === "user" ? "chat-bubble-user" : "chat-bubble-bot"}>
                                        {msg.from === "bot" ? (
                                            <>
                                                <div className="flex-1 text-sm prose-dark prose prose-sm max-w-none space-y-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }} />
                                                {i > 0 && (
                                                    <button onClick={() => downloadNotesPDF(msg.text)}
                                                        className="self-start mt-3 flex items-center gap-1.5 text-xs bg-emerald-500/15 text-emerald-400 font-medium px-2.5 py-1.5 rounded-md hover:bg-emerald-500/25 transition border border-emerald-500/20">
                                                        <span>⬇</span> Download this note
                                                    </button>
                                                )}
                                            </>
                                        ) : (<span className="text-sm">{msg.text}</span>)}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[#060d18] text-xs font-bold mr-2 flex-shrink-0">B</div>
                                    <TypingIndicator />
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 border-t border-emerald-500/10">
                            <div className="flex items-end gap-2">
                                <textarea ref={inputRef} rows={2} value={input}
                                    onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                                    placeholder="Ask from your Biotechnology notes... (e.g. Explain Genetic Engineering)"
                                    className="flex-1 resize-none inp rounded-xl" />
                                <button onClick={handleSend} disabled={!input.trim() || loading}
                                    className="btn-teal rounded-xl px-5 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 text-sm">
                                    Send
                                </button>
                            </div>
                            <p className="text-xs text-slate-600 mt-1.5 ml-1">Press Enter to send · Shift+Enter for new line</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
