"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Cloud, Snowflake, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { WinterScene } from "@/components/winter-scene";
import { calculateDailyScore } from "@/lib/domain/scoring";
import { CHALLENGE_END, CHALLENGE_START, challengeDay, formatDate, isChallengeDate, localDateString } from "@/lib/domain/challenge-dates";

type Profile = { id: string; name: string };
type Habit = { id: string; code: string; name: string; description: string; default_points: number; display_order: number };
type Entry = { id: string; habit_id: string; date: string; completed: boolean; default_points_snapshot: number; points_adjustment: number; adjustment_reason: string | null };
type Adjustment = { id: string; date: string; points_change: number; reason: string | null };
type HabitState = { completed: boolean; adjustment: string; reason: string; saved?: Entry };

export default function Home() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [date, setDate] = useState(localDateString());
  const [entries, setEntries] = useState<Record<string, HabitState>>({});
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [allAdjustments, setAllAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "failed">("saved");
  const [retryAction, setRetryAction] = useState<(() => Promise<void>) | null>(null);
  const [setupError, setSetupError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) { setSetupError("Connect Supabase to start tracking. Add your project URL and publishable key to .env.local, then restart the app and run the database migration."); return; }
    Promise.all([
      supabase.from("profiles").select("id,name").order("name"),
      supabase.from("habits").select("id,code,name,description,default_points,display_order").eq("active", true).order("display_order"),
    ]).then(([p, h]) => {
      if (p.error || h.error) { setSetupError(p.error?.message ?? h.error?.message ?? "Could not load setup data."); return; }
      setProfiles((p.data ?? []) as Profile[]); setHabits((h.data ?? []) as Habit[]);
    });
  }, []);

  const loadDay = useCallback(async () => {
    if (!supabase || !profile || !isChallengeDate(date)) return;
    setLoading(true); setError("");
    const [dayRows, dayAdjustments, totalRows, totalAdj] = await Promise.all([
      supabase.from("daily_entries").select("id,habit_id,date,completed,default_points_snapshot,points_adjustment,adjustment_reason").eq("profile_id", profile.id).eq("date", date),
      supabase.from("point_adjustments").select("id,date,points_change,reason").eq("profile_id", profile.id).eq("date", date).order("created_at"),
      supabase.from("daily_entries").select("id,habit_id,date,completed,default_points_snapshot,points_adjustment,adjustment_reason").eq("profile_id", profile.id),
      supabase.from("point_adjustments").select("id,date,points_change,reason").eq("profile_id", profile.id),
    ]);
    const failure = dayRows.error ?? dayAdjustments.error ?? totalRows.error ?? totalAdj.error;
    if (failure) { setError(failure.message); setLoading(false); return; }
    const byHabit = new Map(((dayRows.data ?? []) as Entry[]).map((e) => [e.habit_id, e]));
    const state: Record<string, HabitState> = {};
    habits.forEach((h) => {
      const e = byHabit.get(h.id);
      state[h.id] = { completed: e?.completed ?? false, adjustment: e && Number(e.points_adjustment) !== 0 ? String(e.points_adjustment) : "", reason: e?.adjustment_reason ?? "", saved: e };
    });
    setEntries(state); setAdjustments((dayAdjustments.data ?? []) as Adjustment[]);
    setAllEntries((totalRows.data ?? []) as Entry[]); setAllAdjustments((totalAdj.data ?? []) as Adjustment[]);
    setSaveStatus("saved"); setLoading(false);
  }, [date, habits, profile]);

  useEffect(() => { void loadDay(); }, [loadDay]);

  const refreshTotals = useCallback(async () => {
    if (!supabase || !profile) return;
    const [totalRows, totalAdj] = await Promise.all([
      supabase.from("daily_entries").select("id,habit_id,date,completed,default_points_snapshot,points_adjustment,adjustment_reason").eq("profile_id", profile.id),
      supabase.from("point_adjustments").select("id,date,points_change,reason").eq("profile_id", profile.id),
    ]);
    if (!totalRows.error && !totalAdj.error) {
      setAllEntries((totalRows.data ?? []) as Entry[]);
      setAllAdjustments((totalAdj.data ?? []) as Adjustment[]);
    }
  }, [profile]);

  const performSave = async (action: () => Promise<{ error: { message: string } | null }>) => {
    setSaveStatus("saving"); setError("");
    const retry = async () => { const result = await action(); if (result.error) { setError(result.error.message); setSaveStatus("failed"); } else { setSaveStatus("saved"); setRetryAction(null); void refreshTotals(); } };
    setRetryAction(() => retry);
    await retry();
  };

  const writeHabit = (habit: Habit, next: HabitState) => {
    if (!supabase || !profile || viewOnly || !isChallengeDate(date)) return;
    const client = supabase;
    const payload = {
      profile_id: profile.id, habit_id: habit.id, date,
      completed: next.completed, points_adjustment: Number(next.adjustment || 0),
      adjustment_reason: next.reason.trim() || null,
      default_points_snapshot: Number(next.saved?.default_points_snapshot ?? habit.default_points),
    };
    setEntries((current) => ({ ...current, [habit.id]: { ...next, saved: next.saved } }));
    void performSave(async () => client.from("daily_entries").upsert(payload, { onConflict: "profile_id,habit_id,date" }));
  };

  const updateHabit = (habit: Habit, patch: Partial<HabitState>) => {
    const old = entries[habit.id] ?? { completed: false, adjustment: "", reason: "" };
    writeHabit(habit, { ...old, ...patch });
  };

  const score = useMemo(() => calculateDailyScore(habits.map((h) => {
    const entry = entries[h.id];
    return { completed: entry?.completed ?? false, defaultPoints: Number(entry?.saved?.default_points_snapshot ?? h.default_points), adjustment: Number(entry?.adjustment || 0) };
  }), adjustments.map((a) => Number(a.points_change))), [habits, entries, adjustments]);

  const totals = useMemo(() => {
    const result = new Map<string, Entry>();
    allEntries.forEach((entry) => result.set(`${entry.date}:${entry.habit_id}`, entry));
    const daySet = new Set([...allEntries.map((entry) => entry.date), ...allAdjustments.map((a) => a.date)]);
    return [...daySet].reduce((sum, day) => {
      const dayScore = calculateDailyScore(habits.map((habit) => {
        const entry = result.get(`${day}:${habit.id}`);
        return { completed: entry?.completed ?? false, defaultPoints: Number(entry?.default_points_snapshot ?? habit.default_points), adjustment: Number(entry?.points_adjustment ?? 0) };
      }), allAdjustments.filter((a) => a.date === day).map((a) => Number(a.points_change)));
      return sum + dayScore.finalScore;
    }, 0);
  }, [allEntries, allAdjustments, habits]);

  const addAdjustment = async () => {
    if (!supabase || !profile || viewOnly) return;
    const client = supabase;
    const owner = profile;
    const selectedDate = date;
    const action = async () => {
      const result = await client.from("point_adjustments").insert({ profile_id: owner.id, date: selectedDate, points_change: 1, reason: "" }).select("id,date,points_change,reason").single();
      if (result.error) { setError(result.error.message); setSaveStatus("failed"); return; }
      setAdjustments((current) => [...current, result.data as Adjustment]); setSaveStatus("saved"); setRetryAction(null); void refreshTotals();
    };
    setSaveStatus("saving"); setError(""); setRetryAction(() => action);
    await action();
  };

  const updateAdjustment = (item: Adjustment, patch: Partial<Adjustment>) => {
    if (!supabase || !profile || viewOnly) return;
    const client = supabase;
    const next = { ...item, ...patch };
    setAdjustments((current) => current.map((a) => a.id === item.id ? next : a));
    void performSave(async () => client.from("point_adjustments").update({ points_change: Number(next.points_change), reason: next.reason?.trim() || null }).eq("id", item.id));
  };

  const deleteAdjustment = async (item: Adjustment) => {
    if (!supabase || viewOnly) return;
    const client = supabase;
    setAdjustments((current) => current.filter((a) => a.id !== item.id));
    await performSave(async () => client.from("point_adjustments").delete().eq("id", item.id));
  };

  const goProfile = (who: Profile, readOnly: boolean) => { setProfile(who); setViewOnly(readOnly); setDate(localDateString()); };
  const today = localDateString();
  const dayNumber = challengeDay(date);
  const canEditDate = isChallengeDate(date) && date <= today;
  const done = habits.length > 0 && score.completedCount === habits.length;

  if (!profile) {
    const ready = profiles.length === 2 && habits.length === 10;
    return <main className="winter-page landing-page">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-9">
        <div className="mb-5 flex items-center gap-3 pl-1 text-[#405e72]"><div className="rounded-2xl border border-white/80 bg-white/80 p-2.5 shadow-sm backdrop-blur"><Snowflake size={23}/></div><span className="text-xs font-bold uppercase tracking-[.22em]">Winter Arc · 2026</span></div>
        <section className="scene-shell landing-scene">
          <WinterScene className="scene-art" />
          <div className="scene-wash" />
          <div className="scene-copy landing-copy"><span className="scene-kicker"><Snowflake size={14}/> 35 winter days · Nov 17 — Dec 21</span><h1>Small steps.<br/><em>A stronger winter.</em></h1><p>Two people, one snowy trail. Keep showing up, one good day at a time.</p></div>
          <div className="scene-caption"><span className="caption-sparkle">✦</span><span>Your next step is waiting</span></div>
        </section>
        <div className="landing-panels">
          <section className="landing-select panel-card"><div className="section-eyebrow">Pick up the trail</div><h2>Who’s checking in today?</h2><p className="panel-subtitle">Choose a profile to update your day.</p>
            {setupError ? <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{setupError}</p> : !ready ? <p className="mt-5 text-sm text-slate-500">Loading your challenge…</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{profiles.map((person, index) => <button key={person.id} onClick={() => goProfile(person, false)} className={`profile-tile ${index === 0 ? "profile-lilac" : "profile-mint"}`}><span className="profile-avatar">{person.name.slice(0, 1)}</span><span><b>{person.name}</b><small>Start today’s check-in <span aria-hidden="true">↗</span></small></span></button>)}</div>}
            <p className="mt-4 text-xs text-slate-400">You can switch profiles or open either one in view-only mode.</p>
          </section>
          <section className="landing-progress panel-card"><div className="section-eyebrow">The journey</div><div className="flex items-end justify-between gap-3"><div><h2>One day at a time</h2><p className="panel-subtitle">Every small win moves you closer to the lodge.</p></div><span className="day-count">{today < CHALLENGE_START ? "35" : today > CHALLENGE_END ? "35" : challengeDay(today)}<small> / 35</small></span></div><div className="journey-track"><div className="journey-fill" style={{ width: `${Math.max(0, Math.min(100, ((challengeDay(today) ?? (today > CHALLENGE_END ? 35 : 0)) / 35) * 100))}%` }}/><span className="journey-hut">⌂</span></div><div className="flex justify-between text-xs text-slate-400"><span>Trailhead · Nov 17</span><span>Warm lodge · Dec 21</span></div></section>
        </div>
        <p className="mt-6 text-center text-xs text-[#8799a4]">Made for the little wins that carry you through winter.</p>
      </div>
    </main>;
  }

  return <main className="winter-page dashboard-page mx-auto min-h-screen max-w-6xl px-4 py-5 md:px-8 md:py-8">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-3"><button onClick={() => setProfile(null)} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={17}/> All profiles</button><div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm"><span className={`h-2 w-2 rounded-full ${saveStatus === "failed" ? "bg-rose-500" : saveStatus === "saving" ? "bg-amber-400" : "bg-emerald-500"}`}/>{saveStatus === "saving" ? "Saving…" : saveStatus === "failed" ? "Save failed" : "Saved"}{saveStatus === "failed" && retryAction && <button className="ml-1 font-bold text-sky-700" onClick={() => void retryAction()}>Retry</button>}</div></header>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
      <section className="scene-shell dashboard-scene lg:col-span-2">
        <WinterScene progress={score.completedCount} className="scene-art" />
        <div className="scene-wash dashboard-wash" />
        <div className="dashboard-copy"><span className="scene-kicker"><Snowflake size={13}/> Day {dayNumber ?? "—"} of 35 · Keep the trail glowing</span><h1>{profile.name}’s Winter Arc</h1><p>{formatDate(date)}{viewOnly ? " · Viewing this trail" : " · One small win at a time"}</p><div className="daily-trail-progress"><div className="flex items-center justify-between"><span>Today’s trail</span><b>{score.completedCount} of {habits.length || 10} steps</b></div><div className="daily-trail-track"><span style={{ width: `${score.completedCount / Math.max(1, habits.length) * 100}%` }}/></div></div></div>
        <label className="scene-profile-control">Your trail <select value={`${profile.id}:${viewOnly}`} onChange={(e) => { const [id, mode] = e.target.value.split(":"); const p = profiles.find((x) => x.id === id); if (p) goProfile(p, mode === "true"); }}><optgroup label="Edit">{profiles.map((p) => <option key={`e${p.id}`} value={`${p.id}:false`}>Edit {p.name}</option>)}</optgroup><optgroup label="View only">{profiles.map((p) => <option key={`v${p.id}`} value={`${p.id}:true`}>View {p.name}</option>)}</optgroup></select></label>
        <div className="scene-milestone">The warm lights are getting closer <span>✦</span></div>
      </section>
      <section>
        <div className="date-control mb-6"><label className="text-sm font-semibold">Check-in date</label><input type="date" min={CHALLENGE_START} max={CHALLENGE_END < today ? CHALLENGE_END : today} value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"/><span className="text-xs text-slate-500">Past days can be edited. Future dates are locked.</span></div>
        {setupError && <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{setupError}</p>}{error && <p className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        {!isChallengeDate(date) && <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Choose a date between November 17 and December 21, 2026.</p>}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Today’s score" value={score.finalScore.toFixed(1).replace(/\.0$/, "")}/><Metric label="Habits complete" value={`${score.completedCount} / ${habits.length || 10}`}/><Metric label="Progress" value={`${habits.length ? Math.round(score.completedCount / habits.length * 100) : 0}%`}/><Metric label="Total points" value={totals.toFixed(1).replace(/\.0$/, "")}/></div>
        <section className="checklist-card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6"><div><h2 className="font-semibold">Daily checklist</h2><p className="mt-0.5 text-sm text-slate-500">Complete what you can. Every bit counts.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${done ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{done ? "Perfect day · 1.5×" : "In progress"}</span></div>
          {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading check-in…</div> : <div className="divide-y divide-slate-100">{habits.map((habit) => { const row = entries[habit.id] ?? { completed: false, adjustment: "", reason: "" }; const effective = (row.completed ? Number(row.saved?.default_points_snapshot ?? habit.default_points) : 0) + Number(row.adjustment || 0); return <div key={habit.id} className={`grid grid-cols-[auto_minmax(0,1fr)_70px] items-center gap-3 px-4 py-4 md:grid-cols-[auto_minmax(0,1fr)_92px_110px] md:gap-4 md:px-6 ${row.completed ? "bg-sky-50/40" : ""}`}>
            <button aria-label={row.completed ? `Mark ${habit.name} incomplete` : `Mark ${habit.name} complete`} disabled={viewOnly || !canEditDate} onClick={() => updateHabit(habit, { completed: !row.completed })} className={`flex h-7 w-7 items-center justify-center rounded-full border ${row.completed ? "border-sky-700 bg-sky-700 text-white" : "border-slate-300 bg-white text-transparent hover:border-sky-500"}`}><Check size={15}/></button>
            <div className="min-w-0"><p className={`font-medium ${row.completed ? "text-slate-500 line-through" : "text-slate-900"}`}>{habit.code === "H10" ? "Journal and Photo Entry" : habit.name}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{habit.code === "H10" ? "Mark this daily habit complete" : habit.description}</p><div className="mt-2 flex gap-2 md:hidden"><input disabled={viewOnly || !canEditDate} aria-label={`${habit.name} point adjustment`} type="number" step="0.5" value={row.adjustment} placeholder="± pts" onChange={(e) => setEntries((cur) => ({ ...cur, [habit.id]: { ...row, adjustment: e.target.value } }))} onBlur={(e) => updateHabit(habit, { adjustment: e.target.value })} className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"/><input disabled={viewOnly || !canEditDate} aria-label={`${habit.name} adjustment reason`} placeholder="Reason (optional)" value={row.reason} onChange={(e) => setEntries((cur) => ({ ...cur, [habit.id]: { ...row, reason: e.target.value } }))} onBlur={(e) => updateHabit(habit, { reason: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"/></div></div>
            <span className="text-right text-sm text-slate-500">{Number(habit.default_points)} pts</span>
            <div className="hidden md:block"><input disabled={viewOnly || !canEditDate} aria-label={`${habit.name} point adjustment`} type="number" step="0.5" value={row.adjustment} placeholder="± 0" onChange={(e) => setEntries((cur) => ({ ...cur, [habit.id]: { ...row, adjustment: e.target.value } }))} onBlur={(e) => updateHabit(habit, { adjustment: e.target.value })} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"/><input disabled={viewOnly || !canEditDate} aria-label={`${habit.name} adjustment reason`} placeholder="Reason" value={row.reason} onChange={(e) => setEntries((cur) => ({ ...cur, [habit.id]: { ...row, reason: e.target.value } }))} onBlur={(e) => updateHabit(habit, { reason: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"/></div>
            <span className="col-start-2 text-xs font-semibold text-slate-600 md:col-start-auto md:text-right">{effective.toFixed(1).replace(/\.0$/, "")} pts</span>
          </div>; })}</div>}
          <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 md:px-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Daily adjustments</h3><p className="text-xs text-slate-500">Bonuses or deductions not tied to a habit</p></div>{!viewOnly && canEditDate && <button onClick={() => void addAdjustment()} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:border-sky-300"><Plus size={14}/> Add</button>}</div>
            {adjustments.length === 0 ? <p className="mt-3 text-xs text-slate-400">No general adjustments</p> : <div className="mt-3 space-y-2">{adjustments.map((item) => <div key={item.id} className="flex items-center gap-2"><input disabled={viewOnly || !canEditDate} type="number" step="0.01" aria-label="Adjustment points" value={item.points_change} onChange={(e) => setAdjustments((cur) => cur.map((a) => a.id === item.id ? { ...a, points_change: Number(e.target.value) } : a))} onBlur={(e) => updateAdjustment(item, { points_change: Number(e.target.value) })} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"/><input disabled={viewOnly || !canEditDate} aria-label="Adjustment reason" value={item.reason ?? ""} placeholder="Reason (optional)" onChange={(e) => setAdjustments((cur) => cur.map((a) => a.id === item.id ? { ...a, reason: e.target.value } : a))} onBlur={(e) => updateAdjustment(item, { reason: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"/>{!viewOnly && <button aria-label="Delete adjustment" onClick={() => void deleteAdjustment(item)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button>}</div>)}</div>}
          </div>
        </section>
      </section>
      <aside className="space-y-4"><section className="summary-card rounded-3xl p-6 text-white shadow-sm"><div className="flex items-center gap-2 text-amber-100"><Snowflake size={18}/><span className="text-xs font-bold uppercase tracking-[.18em]">Daily summary</span></div><p className="mt-6 text-5xl font-semibold tracking-tight">{score.finalScore.toFixed(1).replace(/\.0$/, "")}</p><p className="mt-1 text-sm text-slate-200">points earned today</p><div className="mt-6 h-2 rounded-full bg-white/15"><div className="h-full rounded-full bg-amber-200 transition-all" style={{ width: `${score.completedCount / Math.max(1, habits.length) * 100}%` }}/></div><p className="mt-2 text-xs text-slate-200">{score.completedCount} of {habits.length || 10} habits · {habits.length ? Math.round(score.completedCount / habits.length * 100) : 0}%</p><div className="mt-6 border-t border-white/15 pt-4 text-sm"><div className="flex justify-between"><span className="text-slate-200">Base score</span><span>{score.baseScore.toFixed(1).replace(/\.0$/, "")}</span></div>{score.isPerfect && <div className="mt-2 flex justify-between text-amber-100"><span>Perfect-day bonus</span><span>× 1.5</span></div>}</div></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Challenge guide</h2><p className="mt-2 text-sm leading-6 text-slate-500">Reach 1,225 points by December 21 to qualify as a winner. Both participants can win.</p><div className="mt-4 flex justify-between rounded-xl bg-slate-50 p-3 text-xs"><span className="text-slate-500">Daily maximum (base)</span><b>45 pts</b></div><div className="mt-2 flex justify-between rounded-xl bg-slate-50 p-3 text-xs"><span className="text-slate-500">Perfect day maximum</span><b>67.5 pts</b></div></section>
        <p className="flex items-center gap-2 px-2 text-xs text-slate-400"><Cloud size={14}/> Changes save automatically to your shared challenge.</p>
      </aside>
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p></div>;
}
