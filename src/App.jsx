import { useState, useEffect, useRef } from "react";
import Finance from "./Finance.jsx";

// ─── Constants ─────────────────────────────────────────────────────────────
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const XP_VALUES = { subtask: 15, task_base: 50, high: 50, medium: 25, low: 10, no_snooze: 20, speed: 30 };

const VALID_CATEGORIES = ["Finance", "Health", "Career", "Personal", "Home", "Vehicle", "Other"];
const VALID_PRIORITIES = ["high", "medium", "low"];

const LEVELS = [
  { level: 1, min: 0,    max: 100,  title: "Just Starting",    color: "#71717a" },
  { level: 2, min: 100,  max: 300,  title: "Getting Momentum", color: "#60a5fa" },
  { level: 3, min: 300,  max: 600,  title: "Building Habits",  color: "#a78bfa" },
  { level: 4, min: 600,  max: 1000, title: "On a Roll",        color: "#f59e0b" },
  { level: 5, min: 1000, max: 1500, title: "Unstoppable",      color: "#f97316" },
  { level: 6, min: 1500, max: 2200, title: "Elite",            color: "#ef4444" },
  { level: 7, min: 2200, max: 9999, title: "GOAT",             color: "#00c896" },
];

const ACHIEVEMENTS = [
  { id: "first_blood", title: "First Blood",   desc: "Complete your first task",             icon: "🩸" },
  { id: "speed_run",   title: "Speed Run",     desc: "Complete a task within 1 hour",        icon: "⚡" },
  { id: "no_mercy",    title: "No Mercy",      desc: "Complete a task you snoozed 3+ times", icon: "💀" },
  { id: "triple",      title: "Triple Threat", desc: "Complete 3 tasks in one day",          icon: "🔥" },
  { id: "streak_3",    title: "3 Day Streak",  desc: "Complete tasks 3 days in a row",       icon: "📅" },
  { id: "high_roller", title: "High Roller",   desc: "Complete a HIGH priority task",        icon: "💎" },
  { id: "night_owl",   title: "Night Owl",     desc: "Complete a task after 11pm",           icon: "🦉" },
];

const CONFETTI_COLORS = ["#ff3b3b","#ff8c00","#00c896","#f59e0b","#60a5fa","#e879f9","#fafafa","#ff6b9d"];

const INITIAL_TASKS = [
  {
    id: "demo1", goal: "Open Ally Savings Account", category: "Finance",
    addedAt: Date.now() - HOUR_MS * 50, nagCount: 4, status: "active", priority: "high",
    subtasks: [
      { id: "d1a", text: "Go to ally.com → click 'Open Account'", done: false },
      { id: "d1b", text: "Select 'Online Savings Account' (free)", done: false },
      { id: "d1c", text: "Complete the 10-minute application", done: false },
      { id: "d1d", text: "Create 3 buckets: Emergency / Truck Buyout / Taxes", done: false },
    ]
  },
  {
    id: "demo2", goal: "Call Toyota Financial about lease buyout", category: "Vehicle",
    addedAt: Date.now() - HOUR_MS * 6, nagCount: 1, status: "active", priority: "medium",
    subtasks: [
      { id: "d2a", text: "Find number on lease agreement", done: false },
      { id: "d2b", text: "Ask: are mileage fees waived on buyout?", done: false },
      { id: "d2c", text: "Write down the answer", done: false },
    ]
  }
];

const STORAGE_KEY = "push-v2";

// ─── Helpers ───────────────────────────────────────────────────────────────
function getLvl(xp) {
  return LEVELS.find(l => xp >= l.min && xp < l.max) || LEVELS.at(-1);
}

let _audioCtx = null;
function getAudioCtx() {
  if (_audioCtx) return _audioCtx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) _audioCtx = new Ctx();
  } catch (e) { /* ignored */ }
  return _audioCtx;
}

function tone(ctx, freq, startOffset, duration, peakGain, oscType = "sine") {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = oscType;
  o.frequency.value = freq;
  const t = ctx.currentTime + startOffset;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peakGain, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  o.start(t);
  o.stop(t + duration + 0.05);
}

function playSound(type) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (type === "sub") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = "sine";
      o.frequency.setValueAtTime(660, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.start(); o.stop(ctx.currentTime + 0.25);
    } else if (type === "task") {
      [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, i * 0.09, 0.55, 0.2, "sine"));
    } else if (type === "levelup") {
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, i * 0.1, 0.5, 0.28, "triangle"));
    } else if (type === "ach") {
      [784, 988, 1175].forEach((f, i) => tone(ctx, f, i * 0.12, 0.4, 0.18, "sine"));
    }
  } catch (e) { /* ignore */ }
}

// ─── Root Router ──────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("finance");

  if (view === "finance") {
    return (
      <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", background: "#070707", minHeight: "100vh", color: "#fafafa", maxWidth: "420px", margin: "0 auto", position: "relative", overflowX: "hidden" }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}} *{box-sizing:border-box} input,textarea,button{font-family:'IBM Plex Sans',sans-serif} ::-webkit-scrollbar{display:none} input[type="number"]::-webkit-inner-spin-button,input[type="number"]::-webkit-outer-spin-button{-webkit-appearance:none} input::placeholder,textarea::placeholder{color:#3f3f46}`}</style>
        <div style={{ position: "fixed", top: "12px", right: "16px", zIndex: 100 }}>
          <button onClick={() => setView("push")} style={{ padding: "6px 12px", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "20px", color: "#52525b", fontSize: "10px", letterSpacing: "2px", cursor: "pointer" }}>
            PUSH
          </button>
        </div>
        <Finance />
      </div>
    );
  }

  return <PushApp onBack={() => setView("finance")} />;
}

// ─── Push Component ───────────────────────────────────────────────────────────
function PushApp({ onBack }) {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [nagVisible, setNagVisible] = useState(false);
  const [nagTask, setNagTask] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [reflection, setReflection] = useState("");
  const [expandedId, setExpandedId] = useState("demo1");
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastDate, setLastDate] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [todayDone, setTodayDone] = useState(0);
  const [floats, setFloats] = useState([]);
  const [confetti, setConfetti] = useState([]);
  const [achToast, setAchToast] = useState(null);
  const [lvlUp, setLvlUp] = useState(null);
  const [toast, setToast] = useState(null);
  const fid = useRef(0);
  const timeoutsRef = useRef(new Set());

  const safeTimeout = (fn, ms) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);

    let firstActive = INITIAL_TASKS[0];
    try {
      const r = localStorage.getItem(STORAGE_KEY);
      if (r) {
        const s = JSON.parse(r);
        if (Array.isArray(s.tasks) && s.tasks.length) {
          setTasks(s.tasks);
          firstActive = s.tasks.find(t => t.status === "active") || null;
        }
        if (typeof s.xp === "number") setXp(s.xp);
        if (typeof s.streak === "number") setStreak(s.streak);
        if (typeof s.lastDate === "string") setLastDate(s.lastDate);
        if (Array.isArray(s.achievements)) setAchievements(s.achievements);
        if (typeof s.todayDone === "number") setTodayDone(s.todayDone);
      }
    } catch (e) { /* ignore */ }

    if (firstActive) {
      safeTimeout(() => {
        setNagTask(firstActive);
        setNagVisible(true);
      }, 4500);
    }

    return () => {
      timeoutsRef.current.forEach(id => clearTimeout(id));
      timeoutsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (state) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  };

  const timeAgo = (ts) => {
    if (typeof ts !== "number" || !isFinite(ts)) return "";
    const d = Date.now() - ts, h = Math.floor(d / HOUR_MS);
    if (h >= 24) return `${Math.floor(h / 24)}d ago`;
    if (h > 0) return `${h}h ago`;
    return `${Math.max(1, Math.floor(d / 60000))}m ago`;
  };

  const nagLvl = (task) =>
    Math.min(5, Math.floor((Date.now() - task.addedAt) / HOUR_MS / 10) + Math.floor(task.nagCount / 2) + (task.priority === "high" ? 1 : 0));

  const spawnFloat = (amount, label) => {
    const id = fid.current++;
    setFloats(p => [...p, { id, label: label || `+${amount} XP` }]);
    safeTimeout(() => setFloats(p => p.filter(f => f.id !== id)), 1600);
  };

  const boom = () => {
    const ps = Array.from({ length: 65 }, (_, i) => ({
      id: i, x: 10 + Math.random() * 80,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 9 + 5, delay: Math.random() * 0.5,
      dur: Math.random() * 1.5 + 1.5, shape: Math.random() > 0.5 ? "50%" : "3px",
    }));
    setConfetti(ps);
    safeTimeout(() => setConfetti([]), 3500);
  };

  const earnXp = (amount, label, curXp) => {
    const oldLvl = getLvl(curXp).level;
    const newXp = curXp + amount;
    const newLvlInfo = getLvl(newXp);
    setXp(newXp);
    spawnFloat(amount, label);
    if (newLvlInfo.level > oldLvl) {
      safeTimeout(() => {
        playSound("levelup");
        setLvlUp(newLvlInfo);
        safeTimeout(() => setLvlUp(null), 3200);
      }, 700);
    }
    return newXp;
  };

  const toggleSub = (taskId, subId) => {
    let willComplete = null;
    let earnedXp = false;
    let newXp = xp;

    const updated = tasks.map(t => {
      if (t.id !== taskId) return t;
      const sub = t.subtasks.find(s => s.id === subId);
      const wasUnchecked = sub ? !sub.done : false;
      const subs = t.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s);
      if (wasUnchecked) { playSound("sub"); earnedXp = true; }
      if (subs.length > 0 && subs.every(s => s.done)) willComplete = { ...t, subtasks: subs };
      return { ...t, subtasks: subs };
    });

    if (earnedXp) newXp = earnXp(XP_VALUES.subtask, `+${XP_VALUES.subtask} XP`, xp);

    setTasks(updated);
    if (willComplete) safeTimeout(() => setCompleting(willComplete), 400);
    else save({ tasks: updated, xp: newXp, streak, lastDate, achievements, todayDone });
  };

  const completeTask = () => {
    if (!reflection.trim()) return;
    const td = completing;
    const timeTaken = (Date.now() - td.addedAt) / HOUR_MS;
    const bonus = XP_VALUES[td.priority] || 25;
    const noSnooze = td.nagCount === 0 ? XP_VALUES.no_snooze : 0;
    const speed = timeTaken < 1 ? XP_VALUES.speed : 0;
    const total = XP_VALUES.task_base + bonus + noSnooze + speed;

    const newDone = todayDone + 1;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - DAY_MS).toDateString();
    const newStreak = lastDate === today ? streak : (lastDate === yesterday ? streak + 1 : 1);

    const newXp = earnXp(total, `+${total} XP!`, xp);
    setTodayDone(newDone); setStreak(newStreak); setLastDate(today);
    playSound("task"); boom();

    const hour = new Date().getHours();
    const conditions = [
      ["first_blood", newDone === 1],
      ["speed_run",   timeTaken < 1],
      ["no_mercy",    td.nagCount >= 3],
      ["triple",      newDone >= 3],
      ["high_roller", td.priority === "high"],
      ["night_owl",   hour >= 23 || hour < 4],
      ["streak_3",    newStreak >= 3],
    ];
    const toUnlock = conditions
      .filter(([id, cond]) => cond && !achievements.includes(id))
      .map(([id]) => id);

    const allAch = [...achievements, ...toUnlock];
    setAchievements(allAch);

    toUnlock.forEach((id, idx) => {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (!ach) return;
      safeTimeout(() => {
        playSound("ach");
        setAchToast(ach);
        safeTimeout(() => setAchToast(null), 3500);
      }, 1600 + idx * 4000);
    });

    const updated = tasks.map(t => t.id === td.id
      ? { ...t, status: "done", completedAt: Date.now(), reflection, xpEarned: total }
      : t);
    setTasks(updated); setCompleting(null); setReflection("");
    save({ tasks: updated, xp: newXp, streak: newStreak, lastDate: today, achievements: allAch, todayDone: newDone });
  };

  const snooze = () => {
    const updated = tasks.map(t => t.id === nagTask?.id ? { ...t, nagCount: t.nagCount + 1 } : t);
    setTasks(updated); setNagVisible(false);
    showToast("Snoozed. I'll be back.");
    save({ tasks: updated, xp, streak, lastDate, achievements, todayDone });
  };

  const showToast = (msg) => {
    setToast(msg);
    safeTimeout(() => setToast(null), 2800);
  };

  // Calls our serverless proxy at /api/generate (which holds the API key
  // server-side) instead of api.anthropic.com directly.
  const addGoal = async () => {
    if (!input.trim() || loading) return;
    const goal = input.trim().slice(0, 500);
    setInput(""); setLoading(true);
    const msgs = ["Analyzing...", "Breaking it down...", "Creating your plan..."];
    let i = 0; setLoadMsg(msgs[i]);
    const iv = setInterval(() => { i = (i + 1) % msgs.length; setLoadMsg(msgs[i]); }, 1200);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const rawText = data.content?.[0]?.text || "{}";
      const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned || "{}");

      const safeCategory = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "Other";
      const safePriority = VALID_PRIORITIES.includes(parsed.priority) ? parsed.priority : "medium";
      const safeGoal = typeof parsed.goal === "string" && parsed.goal.trim()
        ? parsed.goal.slice(0, 80)
        : goal.slice(0, 80);
      const rawSubs = Array.isArray(parsed.subtasks) ? parsed.subtasks : [];
      const safeSubs = rawSubs
        .filter(s => typeof s === "string" && s.trim())
        .slice(0, 8)
        .map((text, idx) => ({ id: `${Date.now()}_${idx}`, text: text.slice(0, 200), done: false }));

      if (safeSubs.length === 0) {
        showToast("Couldn't break that down. Try rewording.");
        return;
      }

      const newTask = {
        id: Date.now().toString(),
        goal: safeGoal,
        category: safeCategory,
        priority: safePriority,
        addedAt: Date.now(),
        nagCount: 0,
        status: "active",
        subtasks: safeSubs,
      };
      const updated = [newTask, ...tasks];
      setTasks(updated);
      setExpandedId(newTask.id);
      save({ tasks: updated, xp, streak, lastDate, achievements, todayDone });
    } catch (e) {
      showToast("Connection failed. Try again.");
    } finally {
      clearInterval(iv);
      setLoading(false);
      setLoadMsg("");
    }
  };

  const active = tasks.filter(t => t.status === "active");
  const done = tasks.filter(t => t.status === "done");
  const lvlInfo = getLvl(xp);
  const pctInLvl = Math.min(100, ((xp - lvlInfo.min) / (lvlInfo.max - lvlInfo.min)) * 100);
  const PC = { high: "#ff3b3b", medium: "#ff8c00", low: "#00c896" };
  const PL = { high: "URGENT", medium: "MEDIUM", low: "LOW" };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", background: "#070707", minHeight: "100vh", color: "#fafafa", maxWidth: "420px", margin: "0 auto", position: "relative", overflowX: "hidden" }}>
      <style>{`@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes floatUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-80px);opacity:0}} @keyframes fall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(600deg);opacity:0}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}} @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}} @keyframes slideR{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}} @keyframes popIn{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}} *{box-sizing:border-box} input,textarea,button{font-family:'IBM Plex Sans',sans-serif} ::-webkit-scrollbar{display:none} input::placeholder,textarea::placeholder{color:#3f3f46}`}</style>

      {confetti.map(p => (
        <div key={p.id} style={{ position: "fixed", left: `${p.x}%`, top: "-20px", width: p.size, height: p.size, background: p.color, borderRadius: p.shape, zIndex: 999, pointerEvents: "none", animation: `fall ${p.dur}s ease-in ${p.delay}s forwards` }} />
      ))}

      <div style={{ position: "fixed", bottom: "90px", right: "20px", zIndex: 200, pointerEvents: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
        {floats.map(f => (
          <div key={f.id} style={{ fontFamily: "'Bebas Neue'", fontSize: "28px", color: "#f59e0b", textShadow: "0 0 14px #f59e0b88", animation: "floatUp 1.5s ease forwards", textAlign: "right" }}>
            {f.label}
          </div>
        ))}
      </div>

      {lvlUp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "6px", animation: "fadeIn 0.3s ease" }}>
          <div style={{ fontSize: "70px", animation: "popIn 0.4s cubic-bezier(.16,1,.3,1)" }}>⚡</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: "56px", letterSpacing: "4px", color: lvlUp.color, animation: "popIn 0.4s 0.1s cubic-bezier(.16,1,.3,1) both" }}>LEVEL UP!</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: "30px", color: "#fafafa", letterSpacing: "3px", animation: "popIn 0.4s 0.2s cubic-bezier(.16,1,.3,1) both" }}>LEVEL {lvlUp.level}</div>
          <div style={{ fontSize: "18px", color: lvlUp.color, fontWeight: 500, animation: "popIn 0.4s 0.3s cubic-bezier(.16,1,.3,1) both" }}>{lvlUp.title}</div>
        </div>
      )}

      {achToast && (
        <div style={{ position: "fixed", top: "16px", right: "16px", background: "#0f0f0f", border: `1px solid ${lvlInfo.color}50`, borderRadius: "14px", padding: "14px 16px", zIndex: 250, animation: "slideR 0.4s cubic-bezier(.16,1,.3,1)", maxWidth: "260px", boxShadow: `0 0 20px ${lvlInfo.color}20` }}>
          <div style={{ fontSize: "9px", letterSpacing: "2.5px", color: lvlInfo.color, fontWeight: 700, marginBottom: "6px" }}>ACHIEVEMENT UNLOCKED</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "26px" }}>{achToast.icon}</span>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#fafafa" }}>{achToast.title}</div>
              <div style={{ fontSize: "12px", color: "#71717a" }}>{achToast.desc}</div>
            </div>
          </div>
        </div>
      )}

      {nagVisible && nagTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 50, display: "flex", alignItems: "flex-end", padding: "16px" }}>
          <div style={{ background: "#0f0f0f", border: "1px solid #ff3b3b30", borderRadius: "18px", padding: "24px", width: "100%", animation: "slideUp 0.35s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ width: "40px", height: "4px", background: "#ff3b3b", borderRadius: "2px", marginBottom: "20px" }} />
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#ff3b3b", fontWeight: 700, marginBottom: "10px" }}>👀 HEY. STILL THERE?</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "28px", color: "#fafafa", lineHeight: 1.2, marginBottom: "10px" }}>
              {["Still working on this one?", "This has been sitting here a while.", `You've snoozed this ${nagTask.nagCount} times.`][Math.min(nagTask.nagCount, 2)]}
            </div>
            <div style={{ fontSize: "13px", color: "#52525b", marginBottom: "18px" }}>Goal: <span style={{ color: "#a1a1aa" }}>{nagTask.goal}</span></div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={snooze} style={{ flex: 1, padding: "13px", background: "#141414", border: "1px solid #1a1a1a", borderRadius: "10px", color: "#52525b", fontSize: "13px", cursor: "pointer" }}>Snooze (+1)</button>
              <button onClick={() => { setNagVisible(false); setExpandedId(nagTask.id); }} style={{ flex: 2, padding: "13px", background: "#ff3b3b", border: "none", borderRadius: "10px", color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Let's Do This →</button>
            </div>
          </div>
        </div>
      )}

      {completing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", zIndex: 50, display: "flex", alignItems: "flex-end", padding: "16px" }}>
          <div style={{ background: "#0a160f", border: "1px solid #00c89640", borderRadius: "18px", padding: "24px", width: "100%", animation: "slideUp 0.35s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ fontSize: "42px", marginBottom: "8px" }}>🔥</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "36px", color: "#00c896", letterSpacing: "1px", marginBottom: "4px" }}>You Actually Did It.</div>
            <div style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "8px" }}>{completing.goal}</div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "18px", flexWrap: "wrap" }}>
              {[
                `+${XP_VALUES.task_base + (XP_VALUES[completing.priority] || 25)} XP base`,
                completing.nagCount === 0 && `+${XP_VALUES.no_snooze} no-snooze bonus`,
                (Date.now() - completing.addedAt) / HOUR_MS < 1 && `+${XP_VALUES.speed} speed bonus`,
              ].filter(Boolean).map((label, i) => (
                <span key={i} style={{ fontSize: "11px", background: "#14532d20", color: "#00c896", borderRadius: "20px", padding: "3px 10px" }}>{label}</span>
              ))}
            </div>
            <div style={{ fontSize: "11px", color: "#3f3f46", letterSpacing: "1.5px", marginBottom: "8px" }}>QUICK REFLECTION — required to close</div>
            <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="How'd it go? Can't skip this." autoFocus maxLength={500}
              style={{ width: "100%", background: "#0f1f17", border: "1px solid #00c89620", borderRadius: "10px", padding: "12px", color: "#fafafa", fontSize: "14px", minHeight: "70px", resize: "none", outline: "none" }} />
            <button onClick={completeTask} disabled={!reflection.trim()}
              style={{ width: "100%", marginTop: "12px", padding: "15px", background: reflection.trim() ? "#00c896" : "#141414", border: "none", borderRadius: "12px", color: reflection.trim() ? "#000" : "#3f3f46", fontSize: "15px", fontWeight: 700, cursor: reflection.trim() ? "pointer" : "not-allowed", transition: "all 0.2s", letterSpacing: "0.5px" }}>
              LOCK IT IN →
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "24px 20px 16px", position: "sticky", top: 0, background: "#07070799", backdropFilter: "blur(12px)", zIndex: 10, borderBottom: "1px solid #0f0f0f" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <div>
              <button onClick={onBack} style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "10px", letterSpacing: "2px", cursor: "pointer", padding: "0 0 4px", display: "flex", alignItems: "center", gap: "4px" }}>
                ← FINANCE
              </button>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: "46px", letterSpacing: "4px", color: "#ff8c00", lineHeight: 1 }}>PUSH</div>
            </div>
            <div style={{ fontSize: "12px", color: "#52525b", marginTop: "2px" }}>
              {active.length > 0 ? `${active.length} task${active.length !== 1 ? "s" : ""} waiting on you` : "All clear. Add something."}
            </div>
          </div>
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            {streak > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px" }}>{streak >= 7 ? "🗓️" : streak >= 3 ? "🔥" : "📅"}</div>
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "15px", color: "#f59e0b", fontWeight: 500, lineHeight: 1 }}>{streak}</div>
                <div style={{ fontSize: "9px", color: "#3f3f46", letterSpacing: "1px" }}>STREAK</div>
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "22px", color: lvlInfo.color, fontWeight: 500, lineHeight: 1 }}>{lvlInfo.level}</div>
              <div style={{ fontSize: "9px", color: "#3f3f46", letterSpacing: "1px" }}>LEVEL</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "22px", color: "#00c896", fontWeight: 500, lineHeight: 1 }}>{done.length}</div>
              <div style={{ fontSize: "9px", color: "#3f3f46", letterSpacing: "1px" }}>DONE</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: achievements.length > 0 ? "10px" : "0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "11px", color: lvlInfo.color, fontWeight: 600 }}>{lvlInfo.title}</span>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "11px", color: "#3f3f46" }}>{xp} / {lvlInfo.max} XP</span>
          </div>
          <div style={{ height: "5px", background: "#141414", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctInLvl}%`, background: `linear-gradient(90deg,${lvlInfo.color}88,${lvlInfo.color})`, borderRadius: "4px", transition: "width 0.9s cubic-bezier(.16,1,.3,1)", boxShadow: `0 0 10px ${lvlInfo.color}50` }} />
          </div>
        </div>

        {achievements.length > 0 && (
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {ACHIEVEMENTS.filter(a => achievements.includes(a.id)).map(a => (
              <span key={a.id} title={`${a.title}: ${a.desc}`} style={{ fontSize: "14px", cursor: "default" }}>{a.icon}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "16px 20px 40px" }}>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addGoal()}
              placeholder="Drop a goal. I'll break it down." disabled={loading} maxLength={500}
              style={{ flex: 1, background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "13px 16px", color: "#fafafa", fontSize: "14px", outline: "none" }} />
            <button onClick={addGoal} disabled={loading || !input.trim()}
              style={{ width: "48px", background: loading || !input.trim() ? "#141414" : "#ff8c00", border: "none", borderRadius: "12px", color: "white", fontSize: "20px", cursor: loading || !input.trim() ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {loading ? <span style={{ animation: "pulse 1s infinite" }}>⟳</span> : "→"}
            </button>
          </div>
          {loading && <div style={{ marginTop: "10px", fontSize: "12px", color: "#ff8c00", fontFamily: "'IBM Plex Mono'", animation: "pulse 1.2s infinite" }}>{loadMsg}</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {active.map(task => {
            const lvl = nagLvl(task);
            const dc = task.subtasks.filter(s => s.done).length;
            const pct = task.subtasks.length > 0 ? dc / task.subtasks.length : 0;
            const isExp = expandedId === task.id;
            const uc = lvl >= 4 ? "#ff3b3b" : lvl >= 2 ? "#ff8c00" : "#3f3f46";
            const taskXp = XP_VALUES.task_base + (XP_VALUES[task.priority] || 25) + (task.nagCount === 0 ? XP_VALUES.no_snooze : 0);
            return (
              <div key={task.id} style={{ background: "#0f0f0f", borderRadius: "14px", border: `1px solid ${lvl >= 4 ? "#ff3b3b20" : "#141414"}`, overflow: "hidden", animation: "fadeIn 0.3s ease" }}>
                {lvl >= 2 && <div style={{ height: "2px", background: `linear-gradient(90deg,${uc},transparent)`, width: `${(lvl / 5) * 100}%` }} />}
                <div style={{ padding: "14px 16px 12px", cursor: "pointer" }} onClick={() => setExpandedId(isExp ? null : task.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", letterSpacing: "2px", fontWeight: 700, color: PC[task.priority] }}>{PL[task.priority]}</span>
                      <span style={{ fontSize: "9px", color: "#27272a", letterSpacing: "1.5px" }}>{task.category.toUpperCase()}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#f59e0b", fontFamily: "'IBM Plex Mono'" }}>+{taskXp}xp</span>
                      <div style={{ display: "flex", gap: "3px" }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: i < lvl ? uc : "#1a1a1a", transition: "background 0.3s" }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: "22px", color: "#fafafa", letterSpacing: "0.5px", lineHeight: 1.2, marginBottom: "8px" }}>{task.goal}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <span style={{ fontSize: "11px", color: "#3f3f46", fontFamily: "'IBM Plex Mono'" }}>{timeAgo(task.addedAt)}</span>
                      {task.nagCount > 0 && <span style={{ fontSize: "11px", color: uc }}>snoozed {task.nagCount}×</span>}
                    </div>
                    <span style={{ fontSize: "11px", color: pct === 1 ? "#00c896" : "#3f3f46" }}>{dc}/{task.subtasks.length}</span>
                  </div>
                  <div style={{ height: "2px", background: "#141414", borderRadius: "2px", marginTop: "10px" }}>
                    <div style={{ height: "100%", width: `${pct * 100}%`, background: pct === 1 ? "#00c896" : "#ff8c00", borderRadius: "2px", transition: "width 0.5s cubic-bezier(.16,1,.3,1)", boxShadow: pct > 0 ? `0 0 6px ${pct === 1 ? "#00c896" : "#ff8c00"}60` : "none" }} />
                  </div>
                </div>
                {isExp && (
                  <div style={{ padding: "4px 16px 14px", borderTop: "1px solid #141414", animation: "fadeIn 0.2s ease" }}>
                    {task.subtasks.map((sub, i) => (
                      <button key={sub.id} onClick={() => toggleSub(task.id, sub.id)}
                        style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: "8px 0", width: "100%", borderBottom: i < task.subtasks.length - 1 ? "1px solid #0f0f0f" : "none" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: `1.5px solid ${sub.done ? "#00c896" : "#27272a"}`, background: sub.done ? "#00c896" : "transparent", flexShrink: 0, marginTop: "1px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: sub.done ? "0 0 8px #00c89660" : "none" }}>
                          {sub.done && <span style={{ color: "#000", fontSize: "11px", fontWeight: 800 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span style={{ fontSize: "13px", color: sub.done ? "#3f3f46" : "#a1a1aa", textDecoration: sub.done ? "line-through" : "none", lineHeight: 1.5 }}>{sub.text}</span>
                          {!sub.done && <span style={{ fontSize: "10px", color: "#2a2a2a", flexShrink: 0, marginLeft: "8px", marginTop: "2px" }}>+{XP_VALUES.subtask}xp</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {lvl >= 4 && (
                  <div style={{ background: "#1a0505", padding: "8px 16px", borderTop: "1px solid #ff3b3b15" }}>
                    <span style={{ fontSize: "11px", color: "#ff3b3b", fontWeight: 500 }}>⚠ This has been waiting too long. What's blocking you?</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {active.length === 0 && done.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "64px", color: "#141414", letterSpacing: "4px" }}>READY</div>
            <div style={{ fontSize: "14px", color: "#3f3f46", marginTop: "8px" }}>Type a goal. I'll turn it into a plan.</div>
          </div>
        )}

        {done.length > 0 && (
          <div style={{ marginTop: "28px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "2.5px", color: "#27272a", marginBottom: "12px", fontWeight: 600 }}>COMPLETED</div>
            {done.map(task => (
              <div key={task.id} style={{ background: "#0a160f", borderRadius: "10px", border: "1px solid #00c89615", padding: "12px 14px", marginBottom: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: "17px", color: "#00c896", letterSpacing: "0.5px" }}>✓ {task.goal}</span>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "8px" }}>
                    {task.xpEarned && <span style={{ fontSize: "10px", color: "#f59e0b", fontFamily: "'IBM Plex Mono'" }}>+{task.xpEarned}xp</span>}
                    <span style={{ fontSize: "10px", color: "#1a4731", fontFamily: "'IBM Plex Mono'" }}>{timeAgo(task.completedAt)}</span>
                  </div>
                </div>
                {task.reflection && <div style={{ fontSize: "12px", color: "#166534", marginTop: "5px", fontStyle: "italic", lineHeight: 1.4 }}>"{task.reflection}"</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)", background: "#fafafa", color: "#070707", padding: "11px 20px", borderRadius: "24px", fontSize: "13px", fontWeight: 700, zIndex: 200, whiteSpace: "nowrap", animation: "slideUp 0.3s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
