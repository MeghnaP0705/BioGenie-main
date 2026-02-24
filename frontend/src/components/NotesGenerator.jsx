import { useState, useRef, useEffect } from "react"
import { marked } from 'marked'
import { supabase } from '../supabase'

const API_BASE = "http://localhost:8080"



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
export default function NotesGenerator({ onBack, isAuthenticated, userId }) {
    const WELCOME_MSG = {
        from: "bot",
        text: "Welcome to BioGenie – Biotechnology Notes Generator.\n\nAsk any topic from your Class 9–12 Biotechnology syllabus and I will generate structured, exam-ready notes strictly from the official Biotechnology textbook notes.\n\nNo external knowledge is used. All answers come from pre-indexed PDF content only.",
    }

    const [messages, setMessages] = useState([WELCOME_MSG])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [backendReady, setBackendReady] = useState(null)
    const [indexReady, setIndexReady] = useState(false)

    // Chat History State
    const [chatSessions, setChatSessions] = useState([])
    const [currentChatId, setCurrentChatId] = useState(null)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

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
            .eq('tool_name', 'Notes Generator')
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
                text: msg.text_content
            }))
            setCurrentChatId(chatId)
            setMessages(formattedMessages.length > 0 ? formattedMessages : [WELCOME_MSG])

            // Close sidebar on mobile after selection
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false)
            }
        }
    }

    // Auto-scroll chat
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
                .insert([{ user_id: userId, tool_name: 'Notes Generator', title: title }])
                .select()
                .single()

            if (!chatError && newChat) {
                activeChatId = newChat.id
                setCurrentChatId(newChat.id)
                loadChatSessions() // refresh sidebar
            }
        }

        const userMsg = { from: "user", text: question }
        setMessages(prev => [...prev, userMsg])
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
                body: JSON.stringify({ question, class_level: "general" }),
            })

            const data = await res.json()
            const answer = res.ok ? data.answer : (data.detail || "An error occurred. Please try again.")
            const botMsg = { from: "bot", text: answer }

            setMessages(prev => [...prev, botMsg])

            // Save bot message to DB
            if (isAuthenticated && activeChatId) {
                await supabase.from('chat_messages').insert([{
                    chat_id: activeChatId,
                    sender: 'bot',
                    text_content: answer
                }])
            }

        } catch {
            setMessages(prev => [
                ...prev,
                { from: "bot", text: "Cannot reach the BioGenie server. Please ensure the backend is running on port 8080." },
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
        <div className="h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex flex-col overflow-hidden">

            {/* ─ Header ─ */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="text-sm text-gray-500 hover:text-emerald-700 transition flex items-center gap-1"
                    >
                        ← Back
                    </button>
                    {isAuthenticated && (
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-700 transition"
                            title="Toggle Sidebar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-emerald-800">Biotechnology Notes Generator</h1>
                        <p className="text-xs text-gray-500">Class 9–12 Syllabus · Official Textbook Notes Only</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Backend status badge */}
                    <div className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${backendReady === null ? "bg-gray-100 text-gray-500" :
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
                                .filter(m => m.from === "bot" && m.text !== WELCOME_MSG.text)
                                .map(m => m.text)
                                .join("\n\n-----------------\n\n")
                            if (fullHistory.trim()) {
                                downloadNotesPDF(fullHistory)
                            } else {
                                alert("No generated notes to download yet!")
                            }
                        }}
                        className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition shadow-sm ml-2 md:ml-4"
                    >
                        ⬇ <span className="hidden md:inline">Download Session</span>
                    </button>
                </div>
            </header>

            {/* ─ Main Content Area with Sidebar ─ */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* ─ SIDEBAR: Chat History (Only for authenticated users) ─ */}
                {isAuthenticated && (
                    <div
                        className={`absolute md:relative z-20 h-full bg-white border-r border-emerald-100 flex flex-col shadow-xl md:shadow-none transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full border-none'
                            }`}
                    >
                        {isSidebarOpen && (
                            <>
                                <div className="p-4 border-b border-emerald-50">
                                    <button
                                        onClick={handleNewChat}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2.5 rounded-xl text-sm font-semibold transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                        New Note Session
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">History</div>
                                    {chatSessions.length === 0 ? (
                                        <p className="text-xs text-gray-400 px-2 italic">No previous notes</p>
                                    ) : (
                                        chatSessions.map((chat) => (
                                            <button
                                                key={chat.id}
                                                onClick={() => loadChatInfo(chat.id)}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition ${currentChatId === chat.id
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-800'
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
                                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 mt-1 shadow-sm">
                                            B
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] px-5 py-4 shadow-sm flex flex-col ${msg.from === "user"
                                        ? "bg-emerald-600 text-white rounded-2xl rounded-tr-sm text-sm"
                                        : "bg-white border border-gray-100 rounded-2xl rounded-tl-sm"
                                        }`}>
                                        {msg.from === "bot" ? (
                                            <>
                                                <div
                                                    className="flex-1 text-sm text-gray-800 prose prose-sm prose-emerald max-w-none space-y-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>h3]:text-emerald-800 [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1 [&>p>strong]:text-emerald-900 leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                                                />
                                                {/* Inject download single note button directly under the bot's response */}
                                                {i > 0 && msg.text !== "Cannot reach the BioGenie server. Please ensure the backend is running on port 8080." && (
                                                    <button
                                                        onClick={() => downloadNotesPDF(msg.text)}
                                                        className="self-start mt-4 flex items-center gap-1.5 text-xs bg-emerald-50 border border-emerald-100 text-emerald-700 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition shadow-sm"
                                                    >
                                                        <span>⬇</span> Download Note
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
                                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 shadow-sm">
                                        B
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
                                    <strong>Guest Mode:</strong> Your notes will not be saved. Sign in to save history.
                                </div>
                            )}
                            <div className="flex items-end gap-2 bg-white p-2 rounded-2xl shadow-lg border border-gray-200 focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-400 transition-all">
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask from your Biotechnology notes... (e.g. Explain Genetic Engineering)"
                                    className="flex-1 resize-none bg-transparent outline-none px-4 py-3 text-sm placeholder-gray-400 max-h-32"
                                    style={{ minHeight: '44px' }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-3 h-11 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 font-medium text-sm flex items-center justify-center"
                                >
                                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                    Send
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
