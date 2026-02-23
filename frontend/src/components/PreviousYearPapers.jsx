import { useState, useEffect } from "react"
import { marked } from "marked"
import { supabase } from "../supabase"

const CLASS_CARDS = [
    {
        level: "9",
        label: "Class 9",
        emoji: "🌱",
        color: "from-green-400 to-emerald-500",
        bg: "bg-green-50",
        border: "border-green-200",
        badge: "bg-green-100 text-green-700",
        btn: "bg-green-600 hover:bg-green-700",
        ring: "focus:ring-green-400",
    },
    {
        level: "10",
        label: "Class 10",
        emoji: "🔬",
        color: "from-blue-400 to-cyan-500",
        bg: "bg-blue-50",
        border: "border-blue-200",
        badge: "bg-blue-100 text-blue-700",
        btn: "bg-blue-600 hover:bg-blue-700",
        ring: "focus:ring-blue-400",
    },
    {
        level: "11",
        label: "Class 11",
        emoji: "🧬",
        color: "from-purple-400 to-violet-500",
        bg: "bg-purple-50",
        border: "border-purple-200",
        badge: "bg-purple-100 text-purple-700",
        btn: "bg-purple-600 hover:bg-purple-700",
        ring: "focus:ring-purple-400",
    },
    {
        level: "12",
        label: "Class 12",
        emoji: "🏆",
        color: "from-orange-400 to-red-500",
        bg: "bg-orange-50",
        border: "border-orange-200",
        badge: "bg-orange-100 text-orange-700",
        btn: "bg-orange-600 hover:bg-orange-700",
        ring: "focus:ring-orange-400",
    },
]

function downloadPaperPDF(title, content) {
    const win = window.open("", "_blank")
    win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Georgia, serif; max-width: 750px; margin: 40px auto; color: #1a1a1a; line-height: 1.8; }
          h2 { color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 8px; }
          h3 { color: #1e40af; margin-top: 1.5em; }
          strong { color: #065f46; }
          ul, ol { padding-left: 20px; }
          li { margin-bottom: 6px; }
          @media print { body { margin: 20mm; } }
        </style>
      </head>
      <body>
        <div style="font-size:14px;">${marked.parse(content)}</div>
      </body>
    </html>
  `)
    win.document.close()
    win.focus()
    win.print()
}

// ─── Paper Viewer Modal ───────────────────────────────────────────────────────
function PaperModal({ paper, onClose }) {
    if (!paper) return null
    const content = paper.content || "_No content available. Download from the link below._"
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">{paper.title}</h2>
                        <p className="text-xs text-gray-500">{paper.board} · {paper.year} · {paper.paper_type === "question_paper" ? "Question Paper" : "Answer Key"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => downloadPaperPDF(paper.title, content)}
                            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition flex items-center gap-1"
                        >
                            ⬇ Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-700 text-xl font-bold px-2"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                {/* Modal body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {paper.file_url ? (
                        <iframe
                            src={paper.file_url}
                            title={paper.title}
                            className="w-full h-[60vh] rounded-lg border border-gray-200"
                        />
                    ) : (
                        <div
                            className="prose prose-sm max-w-none text-gray-800 leading-relaxed [&>h2]:text-blue-800 [&>h3]:text-emerald-800 [&>h3]:mt-4 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4"
                            dangerouslySetInnerHTML={{ __html: marked.parse(content) }}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Papers list for a selected class ────────────────────────────────────────
function ClassPapers({ classInfo, onBack }) {
    const [papers, setPapers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activePaper, setActivePaper] = useState(null)
    const [activeTab, setActiveTab] = useState("question_paper") // "question_paper" | "answer_key"

    useEffect(() => {
        const fetchPapers = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from("pyq_papers")
                .select("*")
                .eq("class_level", classInfo.level)
                .order("year", { ascending: false })
            if (error) setError(error.message)
            else setPapers(data || [])
            setLoading(false)
        }
        fetchPapers()
    }, [classInfo.level])

    const years = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a)
    const filtered = papers.filter(p => p.paper_type === activeTab)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center gap-4 shadow-sm">
                <button
                    onClick={onBack}
                    className="text-sm text-gray-500 hover:text-gray-800 transition flex items-center gap-1"
                >
                    ← Back
                </button>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${classInfo.color} flex items-center justify-center text-xl`}>
                    {classInfo.emoji}
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">{classInfo.label} — Previous Year Papers</h1>
                    <p className="text-xs text-gray-500">CBSE Biotechnology · Question Papers & Answer Keys</p>
                </div>
                {/* Year badges */}
                <div className="ml-auto flex gap-2 flex-wrap">
                    {years.map(y => (
                        <span key={y} className={`text-xs px-2 py-0.5 rounded-full font-medium ${classInfo.badge}`}>{y}</span>
                    ))}
                </div>
            </header>

            {/* Tab selector */}
            <div className="flex gap-2 px-6 pt-5 pb-2">
                <button
                    onClick={() => setActiveTab("question_paper")}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "question_paper" ? "bg-gray-800 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                    📝 Question Papers
                </button>
                <button
                    onClick={() => setActiveTab("answer_key")}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "answer_key" ? "bg-emerald-700 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                    ✅ Answer Keys
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-40 text-gray-400">Loading papers...</div>
                ) : error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                        <span className="text-4xl">📄</span>
                        <p className="text-sm">No {activeTab === "question_paper" ? "question papers" : "answer keys"} found for {classInfo.label}.</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(paper => (
                            <div
                                key={paper.id}
                                className={`bg-white border ${classInfo.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col gap-3`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${classInfo.badge}`}>{paper.year}</span>
                                        <p className="text-sm font-semibold text-gray-800 mt-2 leading-snug">{paper.title}</p>
                                    </div>
                                    <span className="text-2xl">{paper.paper_type === "question_paper" ? "📝" : "✅"}</span>
                                </div>
                                <p className="text-xs text-gray-500">{paper.board} · {paper.subject}</p>
                                <button
                                    onClick={() => setActivePaper(paper)}
                                    className={`mt-auto w-full ${classInfo.btn} text-white text-sm font-medium py-2 rounded-xl transition`}
                                >
                                    {paper.file_url ? "View PDF" : "View Paper"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            <PaperModal paper={activePaper} onClose={() => setActivePaper(null)} />
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PreviousYearPapers({ onBack }) {
    const [selectedClass, setSelectedClass] = useState(null)

    if (selectedClass) {
        return (
            <ClassPapers
                classInfo={selectedClass}
                onBack={() => setSelectedClass(null)}
            />
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center gap-4 shadow-sm">
                <button
                    onClick={onBack}
                    className="text-sm text-gray-500 hover:text-gray-800 transition flex items-center gap-1"
                >
                    ← Back
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Previous Year Question Papers</h1>
                    <p className="text-xs text-gray-500">CBSE Biotechnology · Class 9 to 12 · With Answer Keys</p>
                </div>
            </header>

            {/* Class selection grid */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <p className="text-sm text-gray-500 mb-8 font-medium tracking-wide uppercase">Select Your Class</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl w-full">
                    {CLASS_CARDS.map(cls => (
                        <button
                            key={cls.level}
                            onClick={() => setSelectedClass(cls)}
                            className="group flex flex-col items-center bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 p-8 transition-all duration-200 hover:-translate-y-1"
                        >
                            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cls.color} flex items-center justify-center text-4xl shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                                {cls.emoji}
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-1">{cls.label}</h2>
                            <p className="text-xs text-gray-500 mb-4">Biotechnology</p>
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${cls.badge}`}>
                                View Papers →
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
