import { useState, useRef, useEffect } from "react"
import ChatHistorySidebar, { saveSession, loadSession } from "./ChatHistorySidebar"

const API_BASE = "http://localhost:8000"
const CLASS_LEVELS = ["9", "10", "11", "12"]
const SLIDE_COUNT_OPTIONS = [6, 8, 10, 12, 15]

const TOPIC_SUGGESTIONS = [
    "PCR – Polymerase Chain Reaction",
    "DNA Replication",
    "Genetic Engineering",
    "Biotechnology Principles",
    "Tissues and their Types",
    "Recombinant DNA Technology",
    "Applications of Biotechnology",
    "Cell Biology Fundamentals",
]

// ─── Progress steps ──────────────────────────────────────────────────────────
function GeneratingSteps({ step }) {
    const steps = [
        { label: "Searching textbook", icon: "🔍" },
        { label: "Structuring slides", icon: "🤖" },
        { label: "Building .pptx", icon: "📊" },
    ]
    return (
        <div className="flex items-center gap-3 justify-center py-2">
            {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                    <span
                        className={`text-sm transition-all duration-500 ${i < step
                                ? "opacity-100 scale-110"
                                : i === step
                                    ? "opacity-80 animate-pulse"
                                    : "opacity-25"
                            }`}
                    >
                        {s.icon}
                    </span>
                    <span
                        className={`text-xs font-medium transition-all ${i < step
                                ? "text-emerald-400"
                                : i === step
                                    ? "text-violet-300"
                                    : "text-slate-600"
                            }`}
                    >
                        {s.label}
                    </span>
                    {i < steps.length - 1 && (
                        <span className="text-slate-700 ml-1">→</span>
                    )}
                </div>
            ))}
        </div>
    )
}

// ─── Chat message card ────────────────────────────────────────────────────────
function ChatMessage({ msg }) {
    if (msg.type === "request") {
        return (
            <div className="flex justify-end">
                <div className="chat-bubble-user max-w-sm">
                    <p className="text-sm font-semibold">📊 {msg.topic}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                        Class {msg.classLevel}
                        {msg.slideCount ? ` · ~${msg.slideCount} slides` : ""}
                        {msg.focus ? ` · Focus: ${msg.focus}` : ""}
                    </p>
                </div>
            </div>
        )
    }
    if (msg.type === "success") {
        return (
            <div className="flex justify-start items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[#060d18] text-xs font-bold flex-shrink-0 mt-0.5">
                    📊
                </div>
                <div className="chat-bubble-bot max-w-sm">
                    <p className="text-sm font-semibold text-emerald-400 mb-2">✅ Presentation Ready!</p>
                    <p className="text-xs text-slate-400 mb-3">
                        <strong className="text-slate-200">{msg.topic}</strong> · Class {msg.classLevel}
                    </p>
                    <a
                        href={msg.downloadUrl}
                        download={msg.downloadName}
                        className="flex items-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-4 rounded-xl transition text-center justify-center"
                    >
                        ⬇ Download {msg.downloadName}
                    </a>
                    <p className="text-[10px] text-slate-600 mt-2 text-center">
                        Open in PowerPoint, Google Slides, or LibreOffice
                    </p>
                </div>
            </div>
        )
    }
    if (msg.type === "error") {
        return (
            <div className="flex justify-start items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    ❌
                </div>
                <div className="chat-bubble-bot max-w-sm">
                    <p className="text-sm text-red-400">Generation failed</p>
                    <p className="text-xs text-slate-500 mt-1">{msg.detail}</p>
                </div>
            </div>
        )
    }
    return null
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PptMaker({ onBack, isAuthenticated, userId }) {
    const [topic, setTopic] = useState("")
    const [classLevel, setClassLevel] = useState("11")
    const [slideCount, setSlideCount] = useState(8)
    const [focus, setFocus] = useState("")
    const [loading, setLoading] = useState(false)
    const [genStep, setGenStep] = useState(0)
    const [messages, setMessages] = useState([])
    const [sessionId, setSessionId] = useState(null)
    const [backendReady, setBackendReady] = useState(null)
    const chatEndRef = useRef(null)

    // Health check
    useEffect(() => {
        fetch(`${API_BASE}/health`)
            .then(r => r.ok ? r.json() : null)
            .then(d => setBackendReady(d ? true : false))
            .catch(() => setBackendReady(false))
    }, [])

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, loading])

    // ── Persist chat to localStorage ────────────────────────────────────────
    const persistChat = (topicText, resultType, msgs, existingSessionId) => {
        if (!isAuthenticated || !userId) return null
        const title = `📊 ${topicText.slice(0, 55)}`
        const rawMsgs = msgs.map(m => ({
            from: m.type === "request" ? "user" : "bot",
            text: m.type === "request"
                ? `Generate PPT: ${m.topic} (Class ${m.classLevel})`
                : m.type === "success"
                    ? `✅ Download: ${m.downloadName}`
                    : `❌ ${m.detail}`,
        }))
        const newId = saveSession({ userId, feature: "ppt", title, messages: rawMsgs, sessionId: existingSessionId })
        if (newId && !existingSessionId) window.dispatchEvent(new Event("refresh-sidebar-ppt"))
        return newId
    }

    // ── Generate ──────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!topic.trim() || loading) return

        const requestMsg = { type: "request", topic: topic.trim(), classLevel, slideCount, focus: focus.trim() }
        const newMessages = [...messages, requestMsg]
        setMessages(newMessages)
        setLoading(true)
        setGenStep(0)

        // Simulate step progression
        const stepTimer1 = setTimeout(() => setGenStep(1), 4000)
        const stepTimer2 = setTimeout(() => setGenStep(2), 12000)

        // Build topic string with optional focus hint
        const topicStr = focus.trim()
            ? `${topic.trim()}. Focus on: ${focus.trim()}.`
            : topic.trim()

        try {
            const res = await fetch(`${API_BASE}/generate-ppt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: topicStr, class_level: classLevel }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.detail || `Server error ${res.status}`)
            }

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const fname = topic.trim().replace(/\s+/g, "_").slice(0, 50) + ".pptx"

            const successMsg = {
                type: "success",
                topic: topic.trim(),
                classLevel,
                downloadUrl: url,
                downloadName: fname,
            }
            const allMessages = [...newMessages, successMsg]
            setMessages(allMessages)

            const newId = persistChat(topic.trim(), "success", allMessages, sessionId)
            if (newId) setSessionId(newId)
            window.dispatchEvent(new Event("refresh-sidebar-ppt"))

            setTopic(""); setFocus("")
        } catch (e) {
            const errMsg = { type: "error", detail: e.message || "Failed to generate presentation." }
            setMessages([...newMessages, errMsg])
        } finally {
            clearTimeout(stepTimer1); clearTimeout(stepTimer2)
            setLoading(false); setGenStep(0)
        }
    }

    // ── Session management ─────────────────────────────────────────────────
    const handleSelectSession = (session) => {
        const loaded = loadSession(session.id)
        if (!loaded) return
        setSessionId(loaded.id)
        // Reconstruct display messages from raw saved messages
        const rawMsgs = loaded.messages || []
        const rebuilt = []
        for (let i = 0; i < rawMsgs.length; i++) {
            const m = rawMsgs[i]
            if (m.from === "user") {
                const match = m.text.match(/^Generate PPT: (.+?) \(Class (\d+)\)$/)
                rebuilt.push({
                    type: "request",
                    topic: match ? match[1] : m.text,
                    classLevel: match ? match[2] : "11",
                    slideCount: null,
                    focus: "",
                })
            } else {
                if (m.text.startsWith("✅")) {
                    const fname = m.text.replace("✅ Download: ", "")
                    rebuilt.push({ type: "success", topic: "", classLevel: "", downloadUrl: null, downloadName: fname })
                } else {
                    rebuilt.push({ type: "error", detail: m.text.replace("❌ ", "") })
                }
            }
        }
        setMessages(rebuilt)
        setTopic(""); setFocus("")
    }

    const handleNewChat = () => {
        if (messages.length > 0 && isAuthenticated) {
            persistChat(
                messages.find(m => m.type === "request")?.topic || "PPT",
                "done", messages, sessionId
            )
            window.dispatchEvent(new Event("refresh-sidebar-ppt"))
        }
        setMessages([]); setSessionId(null); setTopic(""); setFocus("")
    }

    const statusDot = backendReady === null ? "bg-slate-400" : backendReady ? "bg-emerald-400 animate-pulse" : "bg-red-400"
    const statusText = backendReady === null ? "Connecting…" : backendReady ? "Backend Ready" : "Server Offline"

    return (
        <div className="page-dark flex flex-col" style={{ height: "100vh" }}>
            {/* ── Header ── */}
            <header className="feature-header flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-violet-400 transition flex items-center gap-1">← Back</button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">📊 PPT Maker</h1>
                        <p className="text-xs text-slate-500">Generate AI-powered presentations from your textbooks</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 border border-emerald-500/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                    <span className="text-slate-400">{statusText}</span>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="feature-with-sidebar flex-1 overflow-hidden">
                <ChatHistorySidebar
                    isAuthenticated={isAuthenticated}
                    userId={userId}
                    feature="ppt"
                    activeSessionId={sessionId}
                    onSelectSession={handleSelectSession}
                    onNewChat={handleNewChat}
                />

                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Chat area */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        {messages.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center h-full text-center py-16">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center text-4xl mb-5 anim-float">
                                    📊
                                </div>
                                <h2 className="text-xl font-bold text-slate-100 mb-2">PPT Maker</h2>
                                <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-8">
                                    Enter a topic below and BioGenie will generate a styled PowerPoint presentation
                                    directly from your Class 9–12 textbook content.
                                </p>
                                {/* Feature pills */}
                                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                                    {[
                                        { icon: "📑", text: "8–12 Slides" },
                                        { icon: "🎨", text: "Navy & Teal Theme" },
                                        { icon: "🗒️", text: "Speaker Notes" },
                                        { icon: "📚", text: "Textbook-sourced" },
                                    ].map(f => (
                                        <span key={f.text} className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 border border-emerald-500/10 px-3 py-1.5 rounded-full">
                                            {f.icon} {f.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}

                        {loading && (
                            <div className="flex justify-start items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[#060d18] text-xs font-bold flex-shrink-0 mt-0.5">
                                    📊
                                </div>
                                <div className="chat-bubble-bot">
                                    <p className="text-xs text-violet-300 font-medium mb-2">Building your presentation…</p>
                                    <GeneratingSteps step={genStep} />
                                    <p className="text-[10px] text-slate-600 mt-2 text-center">This usually takes 20–40 seconds</p>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* ── Input panel ── */}
                    <div className="flex-shrink-0 border-t border-violet-500/10 bg-[#060d18]/60 backdrop-blur-sm px-6 py-4 space-y-3">
                        {/* Topic suggestions */}
                        <div className="flex flex-wrap gap-1.5">
                            {TOPIC_SUGGESTIONS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setTopic(s)}
                                    disabled={loading}
                                    className="text-[11px] px-2.5 py-1 rounded-full border border-violet-500/20 text-violet-300 hover:bg-violet-500/10 transition disabled:opacity-40 whitespace-nowrap"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Controls row */}
                        <div className="flex flex-wrap items-end gap-3">
                            {/* Topic input */}
                            <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Topic</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleGenerate()}
                                    placeholder="e.g. PCR – Polymerase Chain Reaction"
                                    className="inp text-sm py-2.5"
                                    disabled={loading}
                                />
                            </div>

                            {/* Focus / custom instructions */}
                            <div className="flex-1 min-w-[160px] flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Custom Focus <span className="text-slate-600 normal-case">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={focus}
                                    onChange={e => setFocus(e.target.value)}
                                    placeholder="e.g. focus on applications"
                                    className="inp text-sm py-2.5"
                                    disabled={loading}
                                />
                            </div>

                            {/* Class level */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Class</label>
                                <div className="flex gap-1">
                                    {CLASS_LEVELS.map(l => (
                                        <button
                                            key={l}
                                            onClick={() => setClassLevel(l)}
                                            disabled={loading}
                                            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${classLevel === l
                                                    ? "bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/20"
                                                    : "bg-white/5 border-violet-500/15 text-slate-400 hover:bg-violet-500/10 hover:text-violet-300"
                                                }`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Slide count */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Slides</label>
                                <select
                                    value={slideCount}
                                    onChange={e => setSlideCount(Number(e.target.value))}
                                    disabled={loading}
                                    className="text-sm border border-violet-500/20 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30 bg-[#0c1a2e] text-violet-300 font-medium disabled:opacity-40"
                                >
                                    {SLIDE_COUNT_OPTIONS.map(n => (
                                        <option key={n} value={n}>~{n} slides</option>
                                    ))}
                                </select>
                            </div>

                            {/* Generate button */}
                            <button
                                onClick={handleGenerate}
                                disabled={!topic.trim() || loading || backendReady === false}
                                className="flex-shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: loading ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                                    color: "white",
                                    border: "1px solid rgba(124,58,237,0.4)",
                                }}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
                                        </svg>
                                        Building…
                                    </span>
                                ) : "✨ Generate"}
                            </button>
                        </div>

                        {/* Hint */}
                        <p className="text-[10px] text-slate-600">
                            Press Enter to generate · Class {classLevel} · ~{slideCount} slides{focus ? ` · Focus: ${focus}` : ""}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
