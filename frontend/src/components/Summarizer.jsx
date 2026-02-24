import { useState, useRef, useEffect } from "react"
import { marked } from 'marked'
import { supabase } from '../supabase'

const API_BASE = "http://localhost:8080"

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

export default function Summarizer({ onBack, isAuthenticated, userId }) {
    const [inputText, setInputText] = useState("")
    const [selectedFile, setSelectedFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState(null)
    const [errorMsg, setErrorMsg] = useState(null)

    // Chat History State
    const [chatSessions, setChatSessions] = useState([])
    const [currentChatId, setCurrentChatId] = useState(null)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    const fileInputRef = useRef(null)

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
            .eq('tool_name', 'Summarizer')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setChatSessions(data)
        }
    }

    async function handleNewSummary() {
        setCurrentChatId(null)
        setSummary(null)
        setInputText("")
        removeFile()
    }

    async function loadChatInfo(chatId) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })

        if (!error && data) {
            setCurrentChatId(chatId)

            // Reconstruct the state from the saved messages
            const userMsg = data.find(m => m.sender === 'user')
            const botMsg = data.find(m => m.sender === 'bot')

            if (userMsg) {
                // If the user message text indicates a PDF was used instead of raw text, we show that (though we can't restore the actual File object)
                if (userMsg.text_content.startsWith("[PDF Document]:")) {
                    setInputText("")
                    // We can't set the actual File object, but we can set a dummy representation if needed. For now, let's just show the summary that was generated.
                } else {
                    setInputText(userMsg.text_content)
                }
            } else {
                setInputText("")
            }

            if (botMsg) {
                setSummary(botMsg.text_content)
            } else {
                setSummary(null)
            }

            removeFile() // clear any current file since we are loading past state

            // Close sidebar on mobile after selection
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false)
            }
        }
    }

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

                // Save to database
                if (isAuthenticated && userId) {
                    let activeChatId = currentChatId;

                    // If this is a new summary, create a new session
                    if (!activeChatId) {
                        const titleSource = selectedFile ? selectedFile.name : inputText;
                        const title = titleSource.length > 30 ? titleSource.substring(0, 30) + '...' : titleSource;

                        const { data: newChat, error: chatError } = await supabase
                            .from('user_chats')
                            .insert([{ user_id: userId, tool_name: 'Summarizer', title: title }])
                            .select()
                            .single()

                        if (!chatError && newChat) {
                            activeChatId = newChat.id;
                            setCurrentChatId(newChat.id);
                            loadChatSessions();
                        }
                    }

                    if (activeChatId) {
                        // Delete previous messages in this chat if we are re-summarizing
                        await supabase.from('chat_messages').delete().eq('chat_id', activeChatId)

                        const userContent = selectedFile ? `[PDF Document]: ${selectedFile.name}` : inputText;

                        await supabase.from('chat_messages').insert([
                            { chat_id: activeChatId, sender: 'user', text_content: userContent },
                            { chat_id: activeChatId, sender: 'bot', text_content: data.summary }
                        ])
                    }
                }

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
        <div className="h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex flex-col overflow-hidden">
            <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-sm text-gray-500 hover:text-emerald-700 transition flex items-center gap-1">
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
                        <h1 className="text-xl font-bold text-emerald-800">Verified Summarizer</h1>
                        <p className="text-xs text-gray-500">Paste notes or upload a PDF. Output checked strictly against Class 9-12 Syllabus.</p>
                    </div>
                </div>
            </header>

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
                                        onClick={handleNewSummary}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2.5 rounded-xl text-sm font-semibold transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                        New Summary
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">History</div>
                                    {chatSessions.length === 0 ? (
                                        <p className="text-xs text-gray-400 px-2 italic">No previous summaries</p>
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

                {/* ─ MAIN CONTENT AREA ─ */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-4 md:p-6 gap-6 bg-slate-50/50">

                    {/* ─ LEFT: Input Panel ─ */}
                    <div className="w-full md:w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 gap-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-emerald-800">Provide Notes</h2>
                            {!isAuthenticated && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 font-semibold uppercase tracking-wider">Guest Mode (Not Saved)</span>
                            )}
                        </div>

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
        </div>
    )
}
