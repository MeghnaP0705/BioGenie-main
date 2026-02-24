import { useState, useRef, useEffect } from "react"
import { marked } from 'marked'
import { supabase } from '../supabase'

const API_BASE = "http://localhost:8080"

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

export default function DoubtSolver({ onBack, isAuthenticated, userId }) {
    const WELCOME_MSG = {
        from: "bot",
        text: "👋 Hello! I'm your **Doubt Solver**.\n\nAsk me any question from your Biotechnology textbook and I'll answer it strictly from the official uploaded content.\n\n_Select your class level on the right before asking._",
    }

    const [messages, setMessages] = useState([WELCOME_MSG])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [classLevel, setClassLevel] = useState("general")
    const [backendReady, setBackendReady] = useState(null)
    const [indexReady, setIndexReady] = useState(false)

    // Chat History State
    const [chatSessions, setChatSessions] = useState([])
    const [currentChatId, setCurrentChatId] = useState(null)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

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

    // Load user chat history if authenticated
    useEffect(() => {
        if (isAuthenticated && userId) {
            loadChatSessions()
        }
    }, [isAuthenticated, userId])

    async function loadChatSessions() {
        const { data, error } = await supabase
            .from('user_chats')
            .select('id, title, created_at')
            .eq('user_id', userId)
            .eq('tool_name', 'Doubt Solver')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setChatSessions(data)
        }
    }

    async function handleNewChat() {
        setCurrentChatId(null)
        setMessages([WELCOME_MSG])
    }

    async function loadChatInfo(chatId) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })

        if (!error && data) {
            const formattedMessages = data.map(msg => ({
                from: msg.sender,
                text: msg.text_content,
                sources: msg.sources || []
            }))
            setCurrentChatId(chatId)
            setMessages(formattedMessages.length > 0 ? formattedMessages : [WELCOME_MSG])

            // Close sidebar on mobile after selection
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false)
            }
        }
    }

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, loading])

    const sendQuestion = async (question) => {
        if (!question.trim() || loading) return

        let activeChatId = currentChatId

        // If authenticated and no active chat, create one first
        if (isAuthenticated && userId && !activeChatId) {
            const title = question.length > 30 ? question.substring(0, 30) + '...' : question
            const { data: newChat, error: chatError } = await supabase
                .from('user_chats')
                .insert([{ user_id: userId, tool_name: 'Doubt Solver', title: title }])
                .select()
                .single()

            if (!chatError && newChat) {
                activeChatId = newChat.id
                setCurrentChatId(newChat.id)
                loadChatSessions() // refresh sidebar
            }
        }

        setMessages(prev => [...prev, { from: "user", text: question }])
        setInput("")
        setLoading(true)

        // Save user message to DB
        if (isAuthenticated && activeChatId) {
            await supabase.from('chat_messages').insert([{
                chat_id: activeChatId,
                sender: 'user',
                text_content: question
            }])
        }

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

            const sources = data.sources || []

            setMessages(prev => [...prev, { from: "bot", text: answer, sources: sources }])

            // Save bot message to DB
            if (isAuthenticated && activeChatId) {
                await supabase.from('chat_messages').insert([{
                    chat_id: activeChatId,
                    sender: 'bot',
                    text_content: answer,
                    sources: sources
                }])
            }

        } catch {
            setMessages(prev => [
                ...prev,
                { from: "bot", text: "❌ Cannot reach the BioGenie server. Please ensure the backend is running on port 8080.", sources: [] },
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
        <div className="h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex flex-col overflow-hidden">

            {/* ─ Header ─ */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="text-sm text-gray-500 hover:text-indigo-700 transition flex items-center gap-1"
                    >
                        ← Back
                    </button>
                    {isAuthenticated && (
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-700 transition"
                            title="Toggle Sidebar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-indigo-800">Doubt Solver</h1>
                        <p className="text-xs text-gray-500">Answers strictly from your uploaded Biotechnology textbooks</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Class level selector */}
                    <div className="hidden md:flex items-center gap-2">
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
                    <div className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        {statusText}
                    </div>
                </div>
            </header>

            {/* ─ Main Content Area with Sidebar ─ */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* ─ SIDEBAR: Chat History (Only for authenticated users) ─ */}
                {isAuthenticated && (
                    <div
                        className={`absolute md:relative z-20 h-full bg-white border-r border-indigo-100 flex flex-col shadow-xl md:shadow-none transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full border-none'
                            }`}
                    >
                        {isSidebarOpen && (
                            <>
                                <div className="p-4 border-b border-indigo-50">
                                    <button
                                        onClick={handleNewChat}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 rounded-xl text-sm font-semibold transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                        New Doubt Session
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">History</div>
                                    {chatSessions.length === 0 ? (
                                        <p className="text-xs text-gray-400 px-2 italic">No previous doubts</p>
                                    ) : (
                                        chatSessions.map((chat) => (
                                            <button
                                                key={chat.id}
                                                onClick={() => loadChatInfo(chat.id)}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition ${currentChatId === chat.id
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-800'
                                                    }`}
                                            >
                                                {chat.title}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Overlay for mobile sidebar */}
                {isAuthenticated && isSidebarOpen && (
                    <div
                        className="absolute inset-0 bg-black/20 z-10 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* ─ MAIN CHAT AREA ─ */}
                <div className="flex flex-col flex-1 h-full bg-slate-50/50">

                    {/* Chat history */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
                        <div className="max-w-4xl mx-auto space-y-6">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                                    {msg.from === "bot" && (
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 mt-1 shadow-sm">
                                            ?
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] px-5 py-4 shadow-sm flex flex-col ${msg.from === "user"
                                        ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm text-sm"
                                        : "bg-white border border-gray-100 rounded-2xl rounded-tl-sm"
                                        }`}>
                                        {msg.from === "bot" ? (
                                            <>
                                                <div
                                                    className="text-sm text-gray-800 prose prose-sm max-w-none leading-relaxed [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>h3]:text-indigo-800 [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1 [&>p>strong]:text-indigo-900"
                                                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                                                />
                                                {/* Source citations */}
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                                        <p className="text-xs font-semibold text-indigo-600 mb-1.5">📚 Sources from textbook:</p>
                                                        <ul className="space-y-1">
                                                            {msg.sources.map((src, si) => (
                                                                <li key={si} className="text-[11px] text-gray-500 italic bg-slate-50 px-2 py-1 rounded inline-block mr-2 mb-1 border border-slate-100">• {src}</li>
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
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 shadow-sm">
                                        ?
                                    </div>
                                    <TypingIndicator />
                                </div>
                            )}

                            <div ref={chatEndRef} className="h-4" />
                        </div>
                    </div>

                    {/* Input bar */}
                    <div className="px-4 py-4 md:px-8 pb-6 bg-gradient-to-t from-slate-50 to-transparent">
                        <div className="max-w-4xl mx-auto">
                            {!isAuthenticated && (
                                <div className="mb-2 text-center text-xs text-amber-600 bg-amber-50 py-1.5 rounded-lg border border-amber-100">
                                    <strong>Guest Mode:</strong> Your chat will not be saved. Sign in to save history.
                                </div>
                            )}

                            {/* Class Selector for Mobile (moved from header) */}
                            <div className="md:hidden flex items-center justify-between gap-2 mb-3 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100">
                                <label className="text-xs font-medium text-gray-600">Select Class:</label>
                                <select
                                    value={classLevel}
                                    onChange={e => setClassLevel(e.target.value)}
                                    className="text-xs border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-indigo-700 font-medium"
                                >
                                    {CLASS_LEVELS.map(l => (
                                        <option key={l} value={l}>
                                            {l === "general" ? "All Classes" : `Class ${l}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Quick suggestion chips */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {["What is genetic engineering?", "Explain PCR process", "What is CRISPR?"].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => sendQuestion(suggestion)}
                                        disabled={loading}
                                        className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-40 shadow-sm"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-end gap-2 bg-white p-2 rounded-2xl shadow-lg border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition-all">
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask your doubt from the textbook... (e.g. What is recombinant DNA?)"
                                    className="flex-1 resize-none bg-transparent outline-none px-4 py-3 text-sm placeholder-gray-400 max-h-32"
                                    style={{ minHeight: '44px' }}
                                />
                                <button
                                    onClick={() => sendQuestion(input)}
                                    disabled={!input.trim() || loading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 h-11 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 font-medium text-sm flex items-center justify-center"
                                >
                                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                    Ask
                                </button>
                            </div>
                            <p className="text-xs text-center text-gray-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
