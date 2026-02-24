import { useState } from "react"
import ChatHistorySidebar, { saveSession, loadSession } from "./ChatHistorySidebar"

const API_BASE = "http://localhost:8000"
const CLASS_LEVELS = ["9", "10", "11", "12"]

export default function PptMaker({ onBack, isAuthenticated, userId }) {
    const [topic, setTopic] = useState("")
    const [classLevel, setClassLevel] = useState("11")
    const [status, setStatus] = useState("idle")
    const [errorMsg, setErrorMsg] = useState("")
    const [downloadUrl, setDownloadUrl] = useState(null)
    const [downloadName, setDownloadName] = useState("")
    const [sessionId, setSessionId] = useState(null)

    const persistChat = (topicText, resultStatus, existingSessionId) => {
        if (!isAuthenticated || !userId) return null
        const title = `📊 ${topicText.slice(0, 55)}`
        const messages = [
            { from: "user", text: `Generate PPT: ${topicText} (Class ${classLevel})` },
            { from: "bot", text: resultStatus === "done" ? `✅ Presentation generated for "${topicText}"` : `❌ Failed: ${resultStatus}` },
        ]
        const newId = saveSession({ userId, feature: "ppt", title, messages, sessionId: existingSessionId })
        if (newId && !existingSessionId) window.dispatchEvent(new Event("refresh-sidebar-ppt"))
        return newId
    }

    const handleGenerate = async () => {
        if (!topic.trim()) { setErrorMsg("Please enter a topic."); setStatus("error"); return }
        setStatus("loading"); setErrorMsg(""); setDownloadUrl(null)

        try {
            const res = await fetch(`${API_BASE}/generate-ppt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: topic.trim(), class_level: classLevel }),
            })
            if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.detail || `Server error ${res.status}`) }
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const fname = topic.trim().replace(/\s+/g, "_").slice(0, 50) + ".pptx"
            setDownloadUrl(url); setDownloadName(fname); setStatus("done")
            const newId = persistChat(topic.trim(), "done", sessionId)
            if (newId) setSessionId(newId)
            window.dispatchEvent(new Event("refresh-sidebar-ppt"))
        } catch (e) {
            setErrorMsg(e.message || "Failed to generate presentation."); setStatus("error")
        }
    }

    const handleReset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl)
        setTopic(""); setDownloadUrl(null); setDownloadName(""); setStatus("idle"); setErrorMsg(""); setSessionId(null)
    }

    const handleSelectSession = (session) => {
        const loaded = loadSession(session.id)
        if (loaded && loaded.messages) {
            setSessionId(loaded.id)
            const userMsg = loaded.messages.find(m => m.from === "user")
            if (userMsg) {
                const match = userMsg.text.match(/^Generate PPT: (.+?) \(Class/)
                if (match) setTopic(match[1]); else setTopic(userMsg.text)
            }
            setStatus("idle"); setDownloadUrl(null); setDownloadName(""); setErrorMsg("")
        }
    }

    const handleNewChat = () => {
        if (status === "done" && isAuthenticated) {
            persistChat(topic.trim(), "done", sessionId)
            window.dispatchEvent(new Event("refresh-sidebar-ppt"))
        }
        handleReset()
    }

    return (
        <div className="page-dark flex flex-col">
            <header className="feature-header flex items-center gap-4">
                <button onClick={onBack} className="text-sm text-slate-500 hover:text-emerald-400 transition flex items-center gap-1">← Back</button>
                <div>
                    <h1 className="text-xl font-bold text-slate-100">PPT Maker</h1>
                    <p className="text-xs text-slate-500">AI-powered presentations from your uploaded textbook content</p>
                </div>
            </header>

            <div className="feature-with-sidebar">
                <ChatHistorySidebar isAuthenticated={isAuthenticated} userId={userId} feature="ppt"
                    activeSessionId={sessionId} onSelectSession={handleSelectSession} onNewChat={handleNewChat} />

                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-xl flex flex-col gap-6">
                        <div className="card-dark p-8 flex flex-col gap-5">
                            {status !== "done" ? (
                                <>
                                    <div className="text-center mb-2">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center text-3xl mx-auto mb-3">📊</div>
                                        <h2 className="text-lg font-bold text-slate-100">Generate a Presentation</h2>
                                        <p className="text-sm text-slate-500 mt-1">Enter a topic from your textbook. AI will build a styled PowerPoint with slides, bullet points &amp; speaker notes.</p>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-300">Topic</label>
                                        <input type="text" value={topic} onChange={e => { setTopic(e.target.value); setStatus("idle"); setErrorMsg("") }}
                                            onKeyDown={e => e.key === "Enter" && handleGenerate()} placeholder="e.g. PCR – Polymerase Chain Reaction"
                                            className="inp" disabled={status === "loading"} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-300">Class Level</label>
                                        <div className="flex gap-2">
                                            {CLASS_LEVELS.map(l => (
                                                <button key={l} onClick={() => setClassLevel(l)}
                                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${classLevel === l
                                                        ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                                                        : "bg-white/5 border-emerald-500/15 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400"}`}>
                                                    Class {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {status === "error" && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">❌ {errorMsg}</div>}
                                    <button onClick={handleGenerate} disabled={status === "loading" || !topic.trim()}
                                        className="w-full btn-teal py-3.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                                        {status === "loading" ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
                                                </svg>
                                                Generating… (~30s)
                                            </span>
                                        ) : "✨ Generate PPT"}
                                    </button>
                                    {status === "loading" && <div className="text-xs text-center text-emerald-400/60 mt-1 animate-pulse">🔍 Searching → 🤖 Structuring → 📊 Building .pptx…</div>}
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-5 py-4">
                                    <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/10">✅</div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-slate-100">Presentation Ready!</h3>
                                        <p className="text-sm text-slate-500 mt-1">Your PowerPoint on <strong className="text-emerald-400">"{topic}"</strong> has been generated.</p>
                                    </div>
                                    <a href={downloadUrl} download={downloadName} className="w-full btn-teal py-3.5 rounded-xl text-center text-sm block">⬇ Download {downloadName}</a>
                                    <button onClick={handleReset} className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-medium py-3 rounded-xl transition text-sm border border-emerald-500/10">↺ Generate Another</button>
                                    <div className="text-xs text-slate-600 text-center">Open in PowerPoint, Google Slides, or LibreOffice Impress</div>
                                </div>
                            )}
                        </div>
                        {status !== "done" && (
                            <div className="grid grid-cols-3 gap-3 text-center">
                                {[{ icon: "📑", label: "8–10 Slides", desc: "Structured content" }, { icon: "✅", label: "Speaker Notes", desc: "For every slide" }, { icon: "🎨", label: "Styled Design", desc: "Navy & teal theme" }].map(item => (
                                    <div key={item.label} className="card-dark rounded-xl p-3">
                                        <div className="text-2xl mb-1">{item.icon}</div>
                                        <p className="text-xs font-semibold text-slate-300">{item.label}</p>
                                        <p className="text-xs text-slate-600">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
