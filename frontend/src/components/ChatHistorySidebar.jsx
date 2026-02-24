import { useState, useEffect } from "react"

// ─── localStorage helpers ───────────────────────────────────────────────────
const STORAGE_KEY = "biogenie_chat_sessions"

function getAllSessions() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch { return [] }
}

function setAllSessions(sessions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

// ─── Helper: group sessions by date ─────────────────────────────────────────
function groupByDate(sessions) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const groups = { Today: [], Yesterday: [], Older: [] }

    sessions.forEach(s => {
        const d = new Date(s.updatedAt)
        if (d >= today) groups.Today.push(s)
        else if (d >= yesterday) groups.Yesterday.push(s)
        else groups.Older.push(s)
    })
    return groups
}

// ─── Generate unique ID ─────────────────────────────────────────────────────
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ─── ChatHistorySidebar ─────────────────────────────────────────────────────
export default function ChatHistorySidebar({
    isAuthenticated,
    userId,
    feature,
    activeSessionId,
    onSelectSession,
    onNewChat,
}) {
    const [sessions, setSessions] = useState([])
    const [collapsed, setCollapsed] = useState(false)

    // Load sessions on mount
    useEffect(() => {
        if (!isAuthenticated) return
        refreshSessions()
    }, [isAuthenticated, userId, feature])

    // Listen for refresh events from feature components
    useEffect(() => {
        const handler = () => refreshSessions()
        window.addEventListener(`refresh-sidebar-${feature}`, handler)
        return () => window.removeEventListener(`refresh-sidebar-${feature}`, handler)
    }, [feature, userId])

    const refreshSessions = () => {
        const all = getAllSessions()
        const filtered = all
            .filter(s => s.feature === feature && s.userId === userId)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        setSessions(filtered)
    }

    const deleteSession = (e, sessionId) => {
        e.stopPropagation()
        const all = getAllSessions().filter(s => s.id !== sessionId)
        setAllSessions(all)
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        if (sessionId === activeSessionId) onNewChat()
    }

    if (!isAuthenticated) return null

    const grouped = groupByDate(sessions)

    return (
        <>
            {/* Mobile toggle button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="chat-sidebar-toggle"
                title={collapsed ? "Show history" : "Hide history"}
            >
                {collapsed ? "☰" : "✕"}
            </button>

            <aside className={`chat-sidebar ${collapsed ? "chat-sidebar-collapsed" : ""}`}>
                {/* New Chat button */}
                <div className="p-3 border-b border-emerald-500/10">
                    <button
                        onClick={() => onNewChat()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm shadow-emerald-500/20"
                    >
                        <span className="text-base">+</span> New Chat
                    </button>
                </div>

                {/* Session list */}
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 sidebar-scroll">
                    {sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-3">
                            <div className="text-2xl mb-2 opacity-50">💬</div>
                            <p className="text-xs text-slate-500">No past conversations yet</p>
                            <p className="text-xs text-slate-600 mt-1">Start chatting to see history here</p>
                        </div>
                    ) : (
                        Object.entries(grouped).map(([label, items]) => {
                            if (items.length === 0) return null
                            return (
                                <div key={label}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 px-2 mb-1.5">
                                        {label}
                                    </p>
                                    <div className="space-y-0.5">
                                        {items.map(session => (
                                            <div
                                                key={session.id}
                                                onClick={() => { onSelectSession(session); setCollapsed(true) }}
                                                className={`session-item group ${activeSessionId === session.id ? "session-item-active" : ""}`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-300 truncate leading-snug">
                                                        {session.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-600 mt-0.5">
                                                        {new Date(session.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => deleteSession(e, session.id)}
                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs p-1 transition flex-shrink-0"
                                                    title="Delete"
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </aside>
        </>
    )
}

// ─── Helper: save a session to localStorage ─────────────────────────────────
export function saveSession({ userId, feature, title, messages, sessionId }) {
    if (!userId) return null

    const all = getAllSessions()

    if (sessionId) {
        // Update existing session
        const idx = all.findIndex(s => s.id === sessionId)
        if (idx !== -1) {
            all[idx].title = title
            all[idx].messages = messages
            all[idx].updatedAt = new Date().toISOString()
            setAllSessions(all)
        }
        return sessionId
    } else {
        // Create new session
        const newId = uid()
        all.push({
            id: newId,
            userId,
            feature,
            title,
            messages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
        setAllSessions(all)
        return newId
    }
}

// ─── Helper: load a session by ID ───────────────────────────────────────────
export function loadSession(sessionId) {
    const all = getAllSessions()
    return all.find(s => s.id === sessionId) || null
}
