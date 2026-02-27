import { useState } from "react"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

const CLASS_LEVELS = ["9", "10", "11", "12"]
const DAILY_HOURS_OPTIONS = [1, 2, 3, 4, 5, 6]

const TYPE_STYLES = {
    study: { bg: "bg-blue-500/15", border: "border-blue-500/25", text: "text-blue-400", dot: "bg-blue-400", label: "Study" },
    revision: { bg: "bg-yellow-500/15", border: "border-yellow-500/25", text: "text-yellow-400", dot: "bg-yellow-400", label: "Revision" },
    mock_test: { bg: "bg-red-500/15", border: "border-red-500/25", text: "text-red-400", dot: "bg-red-400", label: "Mock Test" },
    rest: { bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-500", dot: "bg-slate-400", label: "Rest" },
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function downloadTimetablePDF(plan, examName) {
    const rows = plan.map(d => {
        const style = TYPE_STYLES[d.activity_type] || TYPE_STYLES.study
        return `<tr>
      <td>${d.date}</td>
      <td>${new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</td>
      <td>${d.topic}</td>
      <td style="color:${d.activity_type === 'study' ? '#1d4ed8' : d.activity_type === 'revision' ? '#92400e' : d.activity_type === 'mock_test' ? '#991b1b' : '#374151'}">${style.label}</td>
      <td>${d.description}</td>
    </tr>`
    }).join("")

    const win = window.open("", "_blank")
    win.document.write(`
    <html><head><title>${examName} – Study Timetable</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 900px; margin: 30px auto; color: #111; }
      h1 { color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
      th { background: #065f46; color: white; padding: 8px 10px; text-align: left; }
      td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) { background: #f9fafb; }
      @media print { body { margin: 15mm; } }
    </style></head>
    <body>
      <h1>📅 ${examName} – AI Study Timetable</h1>
      <table><thead><tr><th>Date</th><th>Day</th><th>Topic</th><th>Type</th><th>Plan for the Day</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </body></html>
  `)
    win.document.close(); win.focus(); win.print()
}

// ─── Input Form ───────────────────────────────────────────────────────────────
function TimetableForm({ onGenerate }) {
    const [examName, setExamName] = useState("")
    const [examDate, setExamDate] = useState("")
    const [classLevel, setClassLevel] = useState("11")
    const [dailyHours, setDailyHours] = useState(3)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const today = new Date().toISOString().split("T")[0]

    const handleGenerate = async () => {
        if (!examName.trim()) { setError("Please enter the exam name."); return }
        if (!examDate) { setError("Please select your exam date."); return }
        if (examDate <= today) { setError("Exam date must be in the future."); return }

        setError(null)
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/generate-timetable`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exam_name: examName, exam_date: examDate, class_level: classLevel, daily_hours: dailyHours }),
            })
            const data = await res.json()
            if (res.ok) {
                onGenerate(data.plan, examName)
            } else {
                setError(data.detail || "Failed to generate timetable.")
            }
        } catch {
            setError("Cannot connect to the server. Please ensure the backend is running.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto card-dark p-8 flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-bold text-slate-100 mb-1">Tell us about your exam</h2>
                <p className="text-xs text-slate-500">We'll generate a personalised day-by-day study plan.</p>
            </div>

            {/* Exam name */}
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Exam Name</label>
                <input
                    type="text"
                    value={examName}
                    onChange={e => setExamName(e.target.value)}
                    placeholder="e.g. CBSE Class 11 Biotechnology Final Exam"
                    className="inp"
                />
            </div>

            {/* Exam date + class level */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-300">Exam Date</label>
                    <input
                        type="date"
                        value={examDate}
                        min={today}
                        onChange={e => setExamDate(e.target.value)}
                        className="inp"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-300">Class Level</label>
                    <select
                        value={classLevel}
                        onChange={e => setClassLevel(e.target.value)}
                        className="inp"
                    >
                        {CLASS_LEVELS.map(l => <option key={l} value={l}>Class {l}</option>)}
                    </select>
                </div>
            </div>

            {/* Daily hours */}
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Daily Study Hours Available</label>
                <div className="flex gap-2 flex-wrap">
                    {DAILY_HOURS_OPTIONS.map(h => (
                        <button
                            key={h}
                            onClick={() => setDailyHours(h)}
                            className={`w-12 h-10 rounded-xl text-sm font-semibold border transition ${dailyHours === h
                                ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                                : "bg-white/5 border-emerald-500/15 text-slate-400 hover:bg-emerald-500/10"}`}
                        >
                            {h}h
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full btn-teal py-3.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
                {loading ? "🤖 AI is creating your plan..." : "✨ Generate My Study Timetable"}
            </button>
        </div>
    )
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────
function CalendarGrid({ plan, examName, onReset }) {
    const [completed, setCompleted] = useState(() => {
        try { return JSON.parse(localStorage.getItem("timetable_completed") || "{}") } catch { return {} }
    })
    const [selected, setSelected] = useState(null)

    const toggleComplete = (date) => {
        const next = { ...completed, [date]: !completed[date] }
        setCompleted(next)
        localStorage.setItem("timetable_completed", JSON.stringify(next))
    }

    const byMonth = {}
    plan.forEach(day => {
        const d = new Date(day.date + "T00:00:00")
        const key = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
        if (!byMonth[key]) byMonth[key] = []
        byMonth[key].push({ ...day, dayOfWeek: d.getDay(), dateObj: d })
    })

    const doneCount = plan.filter(d => completed[d.date]).length
    const progress = Math.round((doneCount / plan.length) * 100)

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Progress bar + actions */}
            <div className="card-dark p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-100">📅 {examName}</p>
                        <p className="text-xs text-slate-500">{plan.length} days · {doneCount} completed</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => downloadTimetablePDF(plan, examName)}
                            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition shadow-sm shadow-emerald-500/20"
                        >
                            ⬇ Download PDF
                        </button>
                        <button
                            onClick={onReset}
                            className="text-xs bg-white/5 border border-emerald-500/15 text-slate-400 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
                        >
                            ↺ New Plan
                        </button>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-white/5 rounded-full h-2.5">
                    <div
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-slate-500">{progress}% complete</p>

                {/* Legend */}
                <div className="flex gap-3 flex-wrap mt-1">
                    {Object.entries(TYPE_STYLES).map(([type, s]) => (
                        <div key={type} className="flex items-center gap-1.5 text-xs text-slate-400">
                            <span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Done
                    </div>
                </div>
            </div>

            {/* Month grids */}
            {Object.entries(byMonth).map(([month, days]) => {
                const firstDow = days[0].dayOfWeek
                return (
                    <div key={month} className="card-dark p-5">
                        <h3 className="text-sm font-bold text-slate-300 mb-3">{month}</h3>
                        <div className="grid grid-cols-7 mb-1">
                            {DAY_LABELS.map(d => (
                                <div key={d} className="text-center text-xs font-medium text-slate-600 py-1">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
                            {days.map(day => {
                                const style = TYPE_STYLES[day.activity_type] || TYPE_STYLES.study
                                const done = completed[day.date]
                                const isSelected = selected?.date === day.date
                                return (
                                    <button
                                        key={day.date}
                                        onClick={() => setSelected(isSelected ? null : day)}
                                        className={`relative rounded-xl p-1.5 text-center transition border ${done
                                            ? "bg-emerald-500/15 border-emerald-500/30"
                                            : `${style.bg} ${style.border}`
                                            } ${isSelected ? "ring-2 ring-offset-1 ring-emerald-500 ring-offset-[#0a1628]" : ""} hover:opacity-80`}
                                    >
                                        <p className={`text-xs font-bold leading-none ${done ? "text-emerald-400" : style.text}`}>
                                            {day.dateObj.getDate()}
                                        </p>
                                        <p className={`text-[9px] leading-tight mt-0.5 truncate ${done ? "text-emerald-500" : style.text}`}>
                                            {done ? "✓ Done" : day.activity_type === "mock_test" ? "Mock" : day.activity_type === "rest" ? "Rest" : "Study"}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}

            {/* Day detail panel */}
            {selected && (
                <div className={`card-dark p-5 ${(TYPE_STYLES[selected.activity_type] || TYPE_STYLES.study).border}`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                {new Date(selected.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                            </p>
                            <h3 className={`text-base font-bold mt-1 ${(TYPE_STYLES[selected.activity_type] || TYPE_STYLES.study).text}`}>
                                {selected.topic}
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">{selected.description}</p>
                        </div>
                        <button
                            onClick={() => toggleComplete(selected.date)}
                            className={`ml-4 flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition ${completed[selected.date]
                                ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                                : "bg-white/5 border border-emerald-500/20 text-slate-300 hover:bg-emerald-500/10"
                                }`}
                        >
                            {completed[selected.date] ? "✓ Marked Done" : "Mark as Done"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TimetableGenerator({ onBack }) {
    const [plan, setPlan] = useState(null)
    const [examName, setExamName] = useState("")

    return (
        <div className="page-dark flex flex-col">
            {/* Header */}
            <header className="feature-header flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="text-sm text-slate-500 hover:text-emerald-400 transition flex items-center gap-1"
                >
                    ← Back
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-100">AI Timetable Generator</h1>
                    <p className="text-xs text-slate-500">Personalised day-by-day study plan with progress tracker</p>
                </div>
            </header>

            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                {!plan ? (
                    <TimetableForm
                        onGenerate={(generatedPlan, name) => { setPlan(generatedPlan); setExamName(name) }}
                    />
                ) : (
                    <CalendarGrid
                        plan={plan}
                        examName={examName}
                        onReset={() => setPlan(null)}
                    />
                )}
            </div>
        </div>
    )
}
