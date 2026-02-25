import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase"
import BiotechSimulations from "./components/BiotechSimulations"
import NotesGenerator from "./components/NotesGenerator"
import Summarizer from "./components/Summarizer"
import DoubtSolver from "./components/DoubtSolver"
import PreviousYearPapers from "./components/PreviousYearPapers"
import TimetableGenerator from "./components/TimetableGenerator"
import PptMaker from "./components/PptMaker"
import LessonPlanGenerator from "./components/LessonPlanGenerator"

/* ═══════════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════════ */
function App() {
  const [page, setPage] = useState("landing")
  const [role, setRole] = useState(null)
  const [userName, setUserName] = useState("")
  const [userId, setUserId] = useState(null)
  const [selectedGem, setSelectedGem] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      const hash = window.location.hash
      if (hash && hash.includes("type=recovery")) {
        setIsAuthenticated(false)
        setPage("updatePassword")
        return
      }
      const { data } = await supabase.auth.getSession()
      if (data?.session?.user) {
        setIsAuthenticated(true)
        setUserName(data.session.user.user_metadata?.full_name || "")
        setUserId(data.session.user.id)
        setPage("roles")
      }
    }
    initAuth()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    setUserId(null)
    setUserName("")
    setRole(null)
    setSelectedGem(null)
    setPage("landing")
  }

  if (page === "signup" || page === "login") {
    return (
      <AuthPage
        mode={page}
        goToLogin={() => setPage("login")}
        goToSignup={() => setPage("signup")}
        goHome={() => setPage("landing")}
        goToReset={() => setPage("reset")}
        onSuccess={async () => {
          const { data } = await supabase.auth.getUser()
          setIsAuthenticated(true)
          setUserId(data.user.id)
          setUserName(data.user.user_metadata?.full_name || "")
          setPage("roles")
        }}
      />
    )
  }
  if (page === "reset") return <ResetPasswordPage goBack={() => setPage("login")} />
  if (page === "updatePassword") {
    return (
      <UpdatePassword
        onDone={() => { window.location.hash = ""; setPage("login") }}
      />
    )
  }
  if (page === "roles") {
    return (
      <RoleSelection
        userName={userName}
        isAuthenticated={isAuthenticated}
        onEnter={(r) => { setRole(r); setPage("dashboard") }}
        onLogout={handleLogout}
        onBack={() => setPage("landing")}
      />
    )
  }
  if (page === "dashboard") {
    return (
      <RoleDashboard
        role={role}
        isAuthenticated={isAuthenticated}
        userName={userName}
        onLogout={handleLogout}
        onOpen={(gem) => { setSelectedGem(gem); setPage("gem") }}
        onBack={() => setPage("roles")}
      />
    )
  }
  if (page === "gem") {
    return (
      <GemScreen
        role={role}
        gem={selectedGem}
        onBack={() => setPage("dashboard")}
        isAuthenticated={isAuthenticated}
        userId={userId}
        userName={userName}
        onLogout={handleLogout}
      />
    )
  }
  return (
    <LandingPage
      onStart={() => setPage("roles")}
      goLogin={() => setPage("login")}
      goSignup={() => setPage("signup")}
      isAuthenticated={isAuthenticated}
      userName={userName}
      onLogout={handleLogout}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   SHARED: Profile Dropdown
═══════════════════════════════════════════════════════════ */
function ProfileDropdown({ userName, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  const initial = userName ? userName.charAt(0).toUpperCase() : "U"
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/15 hover:bg-emerald-500/8 transition"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-bold text-[#060d18]">
          {initial}
        </div>
        <span className="text-sm text-slate-300">{userName}</span>
        <span className="text-slate-500 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl glass-dark border border-emerald-500/15 overflow-hidden z-50 anim-scalePop">
          <div className="px-4 py-3 border-b border-emerald-500/10">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-semibold text-slate-200 truncate">{userName}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SHARED: Nav Bar
═══════════════════════════════════════════════════════════ */
function NavBar({ goLogin, goSignup, isAuthenticated, userName, onLogout, onBack }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-8 py-4 glass-dark border-b border-emerald-500/8">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-emerald-400 transition text-sm flex items-center gap-1 mr-2"
          >
            ← Back
          </button>
        )}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[#060d18] font-black text-sm shadow-lg shadow-emerald-500/20">
          B
        </div>
        <span className="font-bold text-slate-100 text-lg tracking-tight">BioGenie</span>
      </div>
      <div className="flex items-center gap-3">
        {!isAuthenticated ? (
          <>
            <button onClick={goLogin} className="btn-outline px-4 py-2 rounded-xl text-sm">Sign In</button>
            <button onClick={goSignup} className="btn-teal px-4 py-2 rounded-xl text-sm">Sign Up</button>
          </>
        ) : (
          <ProfileDropdown userName={userName} onLogout={onLogout} />
        )}
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════════ */
function LandingPage({ onStart, goLogin, goSignup, isAuthenticated, userName, onLogout }) {
  const features = [
    { icon: "📊", title: "PPT Maker", desc: "Generate presentation slides from textbook content" },
    { icon: "📝", title: "Notes Generator", desc: "AI-powered structured notes from uploaded PDFs" },
    { icon: "🔍", title: "Summarizer", desc: "Get concise summaries of textbook chapters" },
    { icon: "💬", title: "Doubt Solver", desc: "Ask questions, get answers from your textbooks" },
    { icon: "📅", title: "Timetable Generator", desc: "Personalised AI study plans for your exams" },
    { icon: "📄", title: "Previous Year Papers", desc: "Access question papers with answer keys" },
  ]

  return (
    <div className="page-bg dot-pattern">
      {/* Ambient orbs */}
      <div className="orb w-96 h-96 bg-emerald-500/12 top-[-80px] left-[-80px] anim-float" />
      <div className="orb w-80 h-80 bg-cyan-500/8 top-20 right-[-60px] anim-float-delay" />
      <div className="orb w-64 h-64 bg-emerald-400/6 bottom-40 left-1/3 anim-float-slow" />
      <div className="orb w-48 h-48 bg-lime-400/5 bottom-20 right-1/4 anim-mesh" />

      <NavBar goLogin={goLogin} goSignup={goSignup} isAuthenticated={isAuthenticated} userName={userName} onLogout={onLogout} />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-40 pb-28">
        <div className="badge-teal mb-6 anim-fadeUp">
          <span>🧬</span> AI-Powered Biotechnology Learning
        </div>

        <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-tight mb-6 anim-fadeUp-1">
          <span className="shimmer-text">BioGenie</span>
        </h1>

        <p className="max-w-xl text-lg text-slate-400 mb-10 leading-relaxed anim-fadeUp-2">
          A personalized biotechnology learning platform for Class 9–12 students.
          AI-generated notes, doubt solving, presentations — all from your textbooks.
        </p>

        <div className="flex gap-4 flex-wrap justify-center anim-fadeUp-3">
          <button
            onClick={onStart}
            className="btn-teal px-8 py-4 rounded-2xl text-base anim-glow"
          >
            {isAuthenticated ? "Go to Dashboard →" : "Continue as Guest →"}
          </button>
          {!isAuthenticated && (
            <button onClick={goLogin} className="btn-outline px-8 py-4 rounded-2xl text-base">
              Sign In
            </button>
          )}
        </div>

        {/* Floating stats */}
        <div className="flex gap-8 mt-16 anim-fadeUp-4 flex-wrap justify-center">
          {[["12+", "Subjects Covered"], ["6", "AI Features"], ["9–12", "Classes Supported"]].map(([n, l]) => (
            <div key={l} className="text-center">
              <p className="text-3xl font-black text-emerald-400">{n}</p>
              <p className="text-xs text-slate-500 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="divider mx-auto max-w-4xl" />

      {/* Features grid */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="badge-teal mb-4">Features</p>
          <h2 className="text-4xl font-bold text-slate-100">Everything you need to excel</h2>
          <p className="text-slate-500 mt-3">All powered by your actual textbook content — no hallucinations</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 stagger">
          {features.map((f) => (
            <div key={f.title} className="gem-card rounded-2xl p-6 anim-fadeUp cursor-default">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-4">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto rounded-3xl p-12 text-center glass border border-emerald-500/15 relative overflow-hidden">
          <div className="orb w-60 h-60 bg-emerald-500/15 top-[-60px] right-[-40px] anim-float-slow" />
          <h2 className="text-3xl font-bold text-slate-100 mb-4 relative z-10">Ready to start learning smarter?</h2>
          <p className="text-slate-500 mb-8 relative z-10">Join students already using BioGenie to ace their exams.</p>
          <button onClick={onStart} className="btn-teal px-10 py-4 rounded-2xl text-base relative z-10">
            {isAuthenticated ? "Open Dashboard →" : "Start for Free →"}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-500/8 py-6 text-center">
        <p className="text-slate-600 text-sm">© 2026 BioGenie · Built for biotechnology students</p>
      </footer>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   AUTH PAGE (Login / Sign Up)
═══════════════════════════════════════════════════════════ */
function AuthPage({ mode, goToLogin, goToSignup, goHome, onSuccess, goToReset }) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password || (mode === "signup" && !fullName)) {
      setError("Please fill all fields"); return
    }
    setLoading(true); setError("")
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } }
        })
        if (error) throw error
        alert("Account created! Please sign in.")
        goToLogin()
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onSuccess()
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="page-bg dot-pattern flex items-center justify-center min-h-screen">
      <div className="orb w-72 h-72 bg-emerald-500/12 top-[-40px] left-[-60px] anim-float" />
      <div className="orb w-56 h-56 bg-cyan-500/8 bottom-20 right-[-30px] anim-float-delay" />

      <div className="w-full max-w-md px-6 anim-scalePop">
        <button onClick={goHome} className="text-slate-500 hover:text-emerald-400 text-sm flex items-center gap-1 mb-8 transition">
          ← Back to Home
        </button>

        <div className="glass-dark rounded-3xl p-8 border border-emerald-500/15">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-black text-[#060d18] shadow-lg shadow-emerald-500/20">B</div>
            <span className="text-xl font-bold text-slate-100">BioGenie</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-100 text-center mb-2">
            {mode === "signup" ? "Create an account" : "Welcome back"}
          </h2>
          <p className="text-slate-500 text-sm text-center mb-8">
            {mode === "signup" ? "Start learning smarter today" : "Sign in to continue learning"}
          </p>

          <div className="flex flex-col gap-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Full Name</label>
                <input className="inp" type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Email</label>
              <input className="inp" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400 font-medium">Password</label>
                {mode === "login" && (
                  <span onClick={goToReset} className="text-xs text-emerald-400 cursor-pointer hover:text-emerald-300 transition">
                    Forgot password?
                  </span>
                )}
              </div>
              <input className="inp" type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-teal w-full py-3.5 rounded-xl mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
            <span
              onClick={mode === "signup" ? goToLogin : goToSignup}
              className="text-emerald-400 cursor-pointer hover:text-emerald-300 transition font-medium"
            >
              {mode === "signup" ? "Sign In" : "Sign Up"}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   RESET PASSWORD
═══════════════════════════════════════════════════════════ */
function ResetPasswordPage({ goBack }) {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleReset = async () => {
    if (!email) { setError("Please enter your email"); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password"
    })
    if (error) setError(error.message)
    else { setError(""); setMessage("Reset link sent! Check your inbox.") }
  }

  return (
    <div className="page-bg dot-pattern flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md px-6 anim-scalePop">
        <button onClick={goBack} className="text-slate-500 hover:text-emerald-400 text-sm flex items-center gap-1 mb-8 transition">
          ← Back to Sign In
        </button>
        <div className="glass-dark rounded-3xl p-8 border border-emerald-500/15">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Reset Password</h2>
          <p className="text-slate-500 text-sm mb-8">Enter your email and we'll send a reset link.</p>
          <div className="flex flex-col gap-4">
            <input className="inp" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            {error && <p className="text-sm text-red-400">{error}</p>}
            {message && <p className="text-sm text-emerald-400">{message}</p>}
            <button onClick={handleReset} className="btn-teal w-full py-3.5 rounded-xl">Send Reset Link</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   UPDATE PASSWORD
═══════════════════════════════════════════════════════════ */
function UpdatePassword({ onDone }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleUpdate = async () => {
    if (!password) { setError("Please enter a new password"); return }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else { setSuccess(true); setTimeout(onDone, 2000) }
  }

  return (
    <div className="page-bg dot-pattern flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md px-6 anim-scalePop">
        <div className="glass-dark rounded-3xl p-8 border border-emerald-500/15">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Set New Password</h2>
          <p className="text-slate-500 text-sm mb-8">Choose a strong new password.</p>
          <div className="flex flex-col gap-4">
            <input className="inp" type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">Password updated! Redirecting…</p>}
            <button onClick={handleUpdate} className="btn-teal w-full py-3.5 rounded-xl">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ROLE SELECTION
═══════════════════════════════════════════════════════════ */
const ROLES = [
  {
    id: "student",
    label: "Student",
    desc: "Access notes, doubt solver, timetables and more",
    icon: "🎓",
    gradient: "from-emerald-500/20 to-emerald-700/10",
    accent: "#34d399",
  },
  {
    id: "teacher",
    label: "Teacher",
    desc: "Generate lesson plans, question papers and assignments",
    icon: "👨‍🏫",
    gradient: "from-cyan-500/20 to-cyan-700/10",
    accent: "#22d3ee",
  },
  {
    id: "public",
    label: "Public",
    desc: "Explore biotechnology awareness and daily life science",
    icon: "🌱",
    gradient: "from-purple-500/20 to-purple-700/10",
    accent: "#a78bfa",
  },
  {
    id: "labs",
    label: "Virtual Labs",
    desc: "Simulate experiments and explore biotech interactively",
    icon: "🔬",
    gradient: "from-amber-500/20 to-amber-700/10",
    accent: "#fbbf24",
  },
]

function RoleSelection({ onEnter, userName, isAuthenticated, onLogout, onBack }) {
  return (
    <div className="page-bg dot-pattern min-h-screen">
      <div className="orb w-80 h-80 bg-emerald-500/8 top-[-40px] right-[-60px] anim-float-slow" />
      <div className="orb w-64 h-64 bg-cyan-500/6 bottom-20 left-[-40px] anim-float-delay" />

      <NavBar isAuthenticated={isAuthenticated} userName={userName} onLogout={onLogout} onBack={onBack} />

      <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-20 pb-12">
        <div className="text-center mb-12 anim-fadeUp">
          <div className="badge-teal mb-5">Choose your role</div>
          <h1 className="text-4xl font-bold text-slate-100 mb-3">
            {isAuthenticated ? `Welcome back${userName ? `, ${userName.split(" ")[0]}` : ""}` : "Who are you?"}
          </h1>
          <p className="text-slate-500">Select your role to access personalised features</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-2xl w-full stagger">
          {ROLES.map((r) => (
            <div
              key={r.id}
              onClick={() => onEnter(r.id)}
              className="role-card p-7 anim-fadeUp group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.gradient} flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform duration-300`}>
                {r.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">{r.label}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{r.desc}</p>
              <div className="flex items-center gap-1.5 mt-5 text-xs font-semibold" style={{ color: r.accent }}>
                Enter as {r.label} <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ROLE DASHBOARD
═══════════════════════════════════════════════════════════ */
const DASHBOARDS = {
  student: [
    { title: "PPT Maker", icon: "📊", color: "from-violet-500/20 to-purple-700/10", tag: "AI" },
    { title: "Notes Generator", icon: "📝", color: "from-emerald-500/20 to-emerald-700/10", tag: "AI" },
    { title: "Summarizer", icon: "🔍", color: "from-cyan-500/20 to-cyan-700/10", tag: "AI" },
    { title: "Previous Year Question Paper", icon: "📄", color: "from-amber-500/20 to-amber-700/10", tag: "Resource" },
    { title: "Timetable Generator", icon: "📅", color: "from-lime-500/20 to-lime-700/10", tag: "AI" },
    { title: "Doubt Solver", icon: "💬", color: "from-pink-500/20 to-pink-700/10", tag: "AI" },
  ],
  teacher: [
    { title: "Lesson Plan Generator", icon: "📋", color: "from-cyan-500/20 to-cyan-700/10", tag: "AI" },
    { title: "Question Paper Generator", icon: "📝", color: "from-lime-500/20 to-lime-700/10", tag: "AI" },
    { title: "Answer Key Generator", icon: "✅", color: "from-emerald-500/20 to-emerald-700/10", tag: "AI" },
    { title: "PPT Maker", icon: "📊", color: "from-violet-500/20 to-purple-700/10", tag: "AI" },
    { title: "Assignment Generator", icon: "📋", color: "from-amber-500/20 to-amber-700/10", tag: "AI" },
    { title: "Student Performance Analyzer", icon: "📈", color: "from-red-500/20 to-red-700/10", tag: "Analytics" },
    { title: "Doubt Clearance", icon: "💡", color: "from-yellow-500/20 to-yellow-700/10", tag: "AI" },
    { title: "Interactive Session For Students", icon: "🎓", color: "from-pink-500/20 to-pink-700/10", tag: "Live" },
  ],
  public: [
    { title: "Biotech Awareness", icon: "🌿", color: "from-lime-500/20 to-lime-700/10", tag: "Learn" },
    { title: "Biotech in Daily Life", icon: "🏠", color: "from-cyan-500/20 to-cyan-700/10", tag: "Explore" },
    { title: "Health & Medicine Biotech", icon: "💊", color: "from-red-500/20 to-red-700/10", tag: "Health" },
    { title: "Agriculture Biotech", icon: "🌾", color: "from-amber-500/20 to-amber-700/10", tag: "Science" },
    { title: "News Simplifier", icon: "📰", color: "from-purple-500/20 to-purple-700/10", tag: "AI" },
  ],
  labs: [],
}

const ROLE_CONFIG = {
  student: { label: "Student Dashboard", emoji: "🎓", accent: "emerald" },
  teacher: { label: "Teacher Dashboard", emoji: "👨‍🏫", accent: "cyan" },
  public: { label: "Explorer Dashboard", emoji: "🌱", accent: "purple" },
  labs: { label: "Virtual Labs", emoji: "🔬", accent: "amber" },
}

function RoleDashboard({ role, onOpen, onBack, isAuthenticated, onLogout, userName }) {
  const items = DASHBOARDS[role] || []
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.student

  if (role === "labs") {
    return (
      <div className="page-bg min-h-screen">
        <NavBar isAuthenticated={isAuthenticated} userName={userName} onLogout={onLogout} onBack={onBack} />
        <div className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
          <div className="mb-8 anim-fadeUp">
            <div className="badge-teal mb-3">🔬 Virtual Labs</div>
            <h1 className="text-3xl font-bold text-slate-100">Interactive Biotechnology Labs</h1>
          </div>
          <BiotechSimulations />
        </div>
      </div>
    )
  }

  return (
    <div className="page-bg dot-pattern min-h-screen">
      <div className="orb w-72 h-72 bg-emerald-500/8 top-[-30px] right-[-30px] anim-float-slow" />

      <NavBar isAuthenticated={isAuthenticated} userName={userName} onLogout={onLogout} onBack={onBack} />

      <div className="pt-28 px-6 pb-16 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 anim-fadeUp">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{cfg.emoji}</span>
            <div className="badge-teal">{cfg.label}</div>
          </div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">
            {isAuthenticated && userName ? `Hello, ${userName.split(" ")[0]} 👋` : "Welcome!"}
          </h1>
          <p className="text-slate-500">Choose a feature to get started</p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 stagger">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => onOpen(item.title)}
              className="gem-card rounded-2xl p-6 text-left anim-fadeUp group"
            >
              <div className="flex items-start justify-between mb-5">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-white/5 px-2 py-1 rounded-full">
                  {item.tag}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 leading-snug mb-2">{item.title}</h3>
              <div className="flex items-center gap-1 text-emerald-500/60 text-xs font-medium group-hover:text-emerald-400 transition-colors">
                Open <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   GEM SCREEN (Feature Router)
═══════════════════════════════════════════════════════════ */
function GemScreen({ gem, role, onBack, isAuthenticated, userId, userName, onLogout }) {
  if (gem === "Notes Generator") return <NotesGenerator onBack={onBack} role={role} isAuthenticated={isAuthenticated} userId={userId} />
  if (gem === "Summarizer") return <Summarizer onBack={onBack} isAuthenticated={isAuthenticated} userId={userId} />
  if (gem === "Doubt Solver") return <DoubtSolver onBack={onBack} isAuthenticated={isAuthenticated} userId={userId} />
  if (gem === "Previous Year Question Paper") return <PreviousYearPapers onBack={onBack} />
  if (gem === "Timetable Generator") return <TimetableGenerator onBack={onBack} />
  if (gem === "PPT Maker") return <PptMaker onBack={onBack} isAuthenticated={isAuthenticated} userId={userId} />
  if (gem === "Lesson Plan Generator") return <LessonPlanGenerator onBack={onBack} isAuthenticated={isAuthenticated} userId={userId} />

  // Coming Soon
  return (
    <div className="page-bg dot-pattern min-h-screen">
      <div className="orb w-64 h-64 bg-emerald-500/8 top-[-30px] left-[-30px] anim-float" />
      <NavBar isAuthenticated={isAuthenticated} userName={userName} onLogout={onLogout} onBack={onBack} />
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center glass-dark rounded-3xl p-14 max-w-sm mx-6 border border-emerald-500/15 anim-scalePop">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl mx-auto mb-6 anim-float">
            🚀
          </div>
          <h3 className="text-2xl font-bold text-slate-100 mb-3">{gem}</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            This module is under development and will be available soon.
          </p>
          <div className="badge-teal mx-auto w-fit">Coming Soon</div>
        </div>
      </div>
    </div>
  )
}

export default App
