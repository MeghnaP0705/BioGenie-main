import { useState, useEffect } from "react"
import { marked } from "marked"
import { supabase } from "../supabase"

const CLASS_CARDS = [
    {
        level: "9",
        label: "Class 9",
        emoji: "🌱",
        color: "from-emerald-400 to-emerald-600",
        accent: "emerald",
        badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
        btn: "btn-teal",
    },
    {
        level: "10",
        label: "Class 10",
        emoji: "🔬",
        color: "from-cyan-400 to-cyan-600",
        accent: "cyan",
        badge: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20",
        btn: "bg-cyan-600 hover:bg-cyan-500 text-white",
    },
    {
        level: "11",
        label: "Class 11",
        emoji: "🧬",
        color: "from-violet-400 to-violet-600",
        accent: "violet",
        badge: "bg-violet-500/15 text-violet-400 border border-violet-500/20",
        btn: "bg-violet-600 hover:bg-violet-500 text-white",
    },
    {
        level: "12",
        label: "Class 12",
        emoji: "🏆",
        color: "from-amber-400 to-amber-600",
        accent: "amber",
        badge: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        btn: "bg-amber-600 hover:bg-amber-500 text-white",
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="card-dark w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/10">
                    <div>
                        <h2 className="text-lg font-bold text-slate-100">{paper.title}</h2>
                        <p className="text-xs text-slate-500">{paper.board} · {paper.year} · {paper.paper_type === "question_paper" ? "Question Paper" : "Answer Key"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => downloadPaperPDF(paper.title, content)}
                            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition flex items-center gap-1 shadow-sm shadow-emerald-500/20"
                        >
                            ⬇ Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-200 text-xl font-bold px-2"
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
                            className="w-full h-[60vh] rounded-lg border border-emerald-500/10"
                        />
                    ) : (
                        <div
                            className="prose prose-sm max-w-none prose-dark leading-relaxed [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4"
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
    const [activeTab, setActiveTab] = useState("question_paper")

    useEffect(() => {
        const fetchPapers = async () => {
            setLoading(true)
            setError(null)
            try {
                // Try multiple folder name variations to be helpful
                const folderVariations = [
                    `class_${classInfo.level}`,
                    `Class_${classInfo.level}`,
                    `class${classInfo.level}`,
                    `Class${classInfo.level}`,
                    classInfo.level
                ]

                let files = []
                let storageError = null

                for (const folder of folderVariations) {
                    const { data, error } = await supabase.storage
                        .from("pyq-papers")
                        .list(folder, {
                            limit: 100,
                            offset: 0,
                            sortBy: { column: 'name', order: 'desc' },
                        })

                    if (data && data.length > 0) {
                        files = data
                        // Store which folder we actually found files in
                        classInfo.actualFolder = folder
                        break
                    }
                    if (error) storageError = error
                }

                if (!files || files.length === 0) {
                    setPapers([])
                    setLoading(false)

                    // DIAGNOSTIC: List EVERYTHING in the root to see what's going on
                    const { data: rootItems } = await supabase.storage.from("pyq-papers").list("", { limit: 100 });

                    const foundFolders = rootItems?.filter(i => !i.id && i.name !== '.emptyFolderPlaceholder').map(i => i.name) || [];
                    const foundFiles = rootItems?.filter(i => i.id).map(i => i.name) || [];

                    let helpMsg = `No files found for Class ${classInfo.level}. \n`;

                    if (foundFiles.some(f => f.toLowerCase().endsWith('.pdf'))) {
                        helpMsg += `⚠️ We found your PDFs, but they are in the ROOT of the bucket. You MUST move them into a folder named 'class_${classInfo.level}' so the app knows they belong to this class.\n\nFiles found in root: ${foundFiles.slice(0, 5).join(", ")}${foundFiles.length > 5 ? "..." : ""}`;
                    } else if (foundFolders.length > 0) {
                        helpMsg += `We found these folders: ${foundFolders.join(", ")}. Please make sure your folder is named exactly 'class_${classInfo.level}'.`;
                    } else {
                        helpMsg += `The bucket seems completely empty. Please upload your PDFs to a folder named 'class_${classInfo.level}'.`;
                    }

                    setError(helpMsg);
                    return
                }

                // Parse filenames to extract metadata
                const parsedPapers = files
                    .filter(f => f.name.toLowerCase().endsWith('.pdf'))
                    .map(f => {
                        const name = f.name.replace('.pdf', '')
                        const parts = name.split('_')

                        // Smart Defaults
                        let year = "Unknown"
                        let type = "question_paper"
                        let set = null
                        let title = ""

                        // 1. Detect Year (any 4-digit part)
                        const yearPart = parts.find(p => /^\d{4}$/.test(p))
                        if (yearPart) year = yearPart

                        // 2. Detect Set (starts with Set or is a small number that's not the year)
                        let setPart = parts.find(p => p.toLowerCase().startsWith('set'))
                        if (setPart) {
                            set = setPart.replace(/set/i, '').trim()
                        } else {
                            // If no "Set" prefix, look for a 1-2 digit number that isn't the year
                            const numPart = parts.find(p => /^\d{1,2}$/.test(p) && p !== yearPart)
                            if (numPart) {
                                set = numPart
                                setPart = numPart
                            }
                        }

                        // 3. Detect Paper Type (check for AK, Answer, or Key)
                        const isAnswerKey = parts.some(p =>
                            ['ak', 'answer', 'key'].includes(p.toLowerCase())
                        )
                        if (isAnswerKey) type = "answer_key"

                        // 4. Construct Title from remaining parts
                        const skipParts = [yearPart, setPart, `class${classInfo.level}`, `class_${classInfo.level}`]
                        const titleParts = parts.filter(p =>
                            p && !skipParts.includes(p.toLowerCase()) &&
                            !['ak', 'qp', 'answer', 'key', 'paper'].includes(p.toLowerCase())
                        )

                        if (titleParts.length > 0) {
                            title = titleParts.join(' ')
                        } else {
                            title = type === "question_paper" ? "Question Paper" : "Answer Key"
                        }

                        const { data: publicUrlData } = supabase.storage
                            .from("pyq-papers")
                            .getPublicUrl(`${classInfo.actualFolder || `class_${classInfo.level}`}/${f.name}`)

                        return {
                            id: f.id,
                            title: set ? `${title} (Set ${set})` : title,
                            year: year,
                            paper_type: type,
                            board: "CBSE",
                            subject: "Biotechnology",
                            file_url: publicUrlData?.publicUrl || null
                        }
                    })

                setPapers(parsedPapers)
            } catch (err) {
                console.error("Error fetching papers:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchPapers()
    }, [classInfo.level])

    const years = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a)
    const filtered = papers.filter(p => p.paper_type === activeTab)

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
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${classInfo.color} flex items-center justify-center text-xl shadow-lg`}>
                    {classInfo.emoji}
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-100">{classInfo.label} — Previous Year Papers</h1>
                    <p className="text-xs text-slate-500">CBSE Biotechnology · Question Papers & Answer Keys</p>
                </div>
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
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "question_paper" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "bg-white/5 border border-emerald-500/15 text-slate-400 hover:bg-emerald-500/10"}`}
                >
                    📝 Question Papers
                </button>
                <button
                    onClick={() => setActiveTab("answer_key")}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "answer_key" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "bg-white/5 border border-emerald-500/15 text-slate-400 hover:bg-emerald-500/10"}`}
                >
                    ✅ Answer Keys
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-40 text-slate-500">Loading papers...</div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-60 text-center gap-4">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm max-w-md">
                            <p className="font-bold mb-1">⚠️ Issue Loading Papers</p>
                            {error}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-xs bg-slate-800 text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-700 transition"
                        >
                            Refresh App
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                        <span className="text-4xl">📄</span>
                        <p className="text-sm">No {activeTab === "question_paper" ? "question papers" : "answer keys"} found for {classInfo.label}.</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(paper => (
                            <div
                                key={paper.id}
                                className="card-dark p-5 flex flex-col gap-3 hover:border-emerald-500/30 transition"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${classInfo.badge}`}>{paper.year}</span>
                                        <p className="text-sm font-semibold text-slate-200 mt-2 leading-snug">{paper.title}</p>
                                    </div>
                                    <span className="text-2xl">{paper.paper_type === "question_paper" ? "📝" : "✅"}</span>
                                </div>
                                <p className="text-xs text-slate-500">{paper.board} · {paper.subject}</p>
                                <button
                                    onClick={() => setActivePaper(paper)}
                                    className={`mt-auto w-full ${classInfo.btn} text-sm font-medium py-2 rounded-xl transition`}
                                >
                                    {paper.file_url ? "View PDF" : "View Paper"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
                    <h1 className="text-xl font-bold text-slate-100">Previous Year Question Papers</h1>
                    <p className="text-xs text-slate-500">CBSE Biotechnology · Class 9 to 12 · With Answer Keys</p>
                </div>
            </header>

            {/* Class selection grid */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <p className="text-sm text-slate-500 mb-8 font-medium tracking-wide uppercase">Select Your Class</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl w-full">
                    {CLASS_CARDS.map(cls => (
                        <button
                            key={cls.level}
                            onClick={() => setSelectedClass(cls)}
                            className="group flex flex-col items-center card-dark p-8 transition-all duration-200 hover:-translate-y-2 hover:border-emerald-500/30"
                        >
                            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cls.color} flex items-center justify-center text-4xl shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                                {cls.emoji}
                            </div>
                            <h2 className="text-xl font-bold text-slate-100 mb-1">{cls.label}</h2>
                            <p className="text-xs text-slate-500 mb-4">Biotechnology</p>
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
