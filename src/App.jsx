import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_PREFIX = "todai-plan";
const MOBILE_MAX_WIDTH = 560;

const defaultProfile = {
  appTitle: "合格戦略プランナー",
  userType: "高校生",
  currentSchool: "立川高校",
  targetUniversity: "東京大学",
  targetFaculty: "文科三類",
  examDate: "2027-02-25",
  scheduleStyle: "school",
  subjects: ["英語", "数学", "国語", "世界史", "地理"],
  goals: [
    "共通テストと二次対策を両立する",
    "毎週の学習ログを可視化する",
    "AI 出力をそのまま作戦に反映できる形で整理する",
  ],
};

const presetProfiles = [
  {
    id: "todai",
    label: "東大向け",
    profile: defaultProfile,
  },
  {
    id: "kyoto",
    label: "京大向け",
    profile: {
      ...defaultProfile,
      currentSchool: "任意の高校",
      targetUniversity: "京都大学",
      targetFaculty: "総合人間学部",
      examDate: "2027-02-25",
      subjects: ["英語", "数学", "国語", "日本史", "理科基礎"],
    },
  },
  {
    id: "private",
    label: "私大向け",
    profile: {
      ...defaultProfile,
      currentSchool: "任意の高校",
      targetUniversity: "早稲田大学",
      targetFaculty: "政治経済学部",
      examDate: "2027-02-12",
      subjects: ["英語", "国語", "日本史", "小論文"],
      scheduleStyle: "flex",
    },
  },
];

const scheduleTemplates = {
  school: {
    label: "平日学校あり",
    blocks: [
      { slot: "朝 30分", focus: "英語", detail: "音読と単語確認で立ち上げる" },
      { slot: "放課後 90分", focus: "数学", detail: "演習 2 題 + 復習までやる" },
      { slot: "夜 60分", focus: "社会 / 国語", detail: "暗記と記述を交互に回す" },
      { slot: "就寝前 15分", focus: "振り返り", detail: "タイマー記録と明日の優先順位確認" },
    ],
  },
  vacation: {
    label: "長期休暇",
    blocks: [
      { slot: "午前 180分", focus: "重い科目", detail: "数学か英語長文を最優先に固定" },
      { slot: "昼 120分", focus: "社会", detail: "通史 + 一問一答 + 記述確認" },
      { slot: "夕方 120分", focus: "国語", detail: "現代文 1 題と古文の復習" },
      { slot: "夜 90分", focus: "弱点補強", detail: "模試で落とした単元だけ処理する" },
    ],
  },
  flex: {
    label: "大学別カスタム",
    blocks: [
      { slot: "最重要 120分", focus: "配点最大科目", detail: "毎日固定で確保する" },
      { slot: "第2 優先 90分", focus: "安定化科目", detail: "得点の再現性を上げる" },
      { slot: "調整 60分", focus: "AI で得た論点", detail: "最新情報や過去問傾向を整理する" },
      { slot: "記録 15分", focus: "ログ更新", detail: "タイマーと作戦を翌日に繋げる" },
    ],
  },
};

const roadmapPhases = [
  {
    id: "foundation",
    title: "基礎固め",
    months: "3-6か月",
    accent: "#ef7c52",
    summary: "参考書ルートを固定し、毎日の学習量を安定させる。",
    bullets: [
      "英数は毎日触る。社会は週単位で積み上げる。",
      "学習時間よりも、解き直し率と継続率を優先する。",
      "AI から拾った大学情報はこの段階で JSON 化して保存する。",
    ],
  },
  {
    id: "expansion",
    title: "得点力拡張",
    months: "夏まで",
    accent: "#2b9d8f",
    summary: "科目ごとの穴を埋めつつ、模試形式に慣れる。",
    bullets: [
      "週 1 回は時間を測って解く。",
      "ログを見て、勉強しているつもりの科目を炙り出す。",
      "学部別の頻出テーマを AI 取り込みで追加する。",
    ],
  },
  {
    id: "exam",
    title: "実戦最適化",
    months: "秋以降",
    accent: "#e9c46a",
    summary: "配点ベースで優先順位を切り替え、合格ラインに寄せる。",
    bullets: [
      "過去問の年度別管理を徹底する。",
      "失点理由を AI 取り込みメモに残し、次の週次計画へ反映する。",
      "共通テストと二次の切替時期を固定する。",
    ],
  },
];

const aiImportExample = {
  university: "東京大学",
  faculty: "文科三類",
  year: "2026",
  examDate: "2027-02-25",
  scoreTargets: [
    { label: "安全圏", value: 365 },
    { label: "標準", value: 350 },
    { label: "挑戦", value: 340 },
  ],
  subjectDifficulty: [
    { subject: "英語", level: 4, comment: "語彙と要約の完成度が差になる。" },
    { subject: "数学", level: 4, comment: "典型を高速で処理できるかが重要。" },
    { subject: "国語", level: 3, comment: "古文の失点を固定化しない。" },
    { subject: "世界史", level: 5, comment: "通史理解と論述語彙の両方が必要。" },
  ],
  actionItems: [
    "夏までに英数の基礎参考書を一周",
    "秋から 10 年分の過去問を管理",
    "論述科目は毎週 1 本添削前提で回す",
  ],
  notes: "出力は事実ベースで、推測は推測と明記する。",
};

function storageKey(name) {
  return `${STORAGE_PREFIX}:${name}`;
}

function loadJson(name, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(name, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(name), JSON.stringify(value));
  } catch {
    // Ignore storage failures on locked-down browsers.
  }
}

function dateLabel(value) {
  if (!value) return "未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDuration(seconds) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function buildAiPrompt(profile) {
  return [
    "以下の条件に合わせて、必ず JSON のみを返してください。",
    "文章説明や markdown は不要です。",
    "",
    "条件:",
    `- 対象大学: ${profile.targetUniversity}`,
    `- 学部/類: ${profile.targetFaculty}`,
    `- 想定受験生: ${profile.currentSchool} の ${profile.userType}`,
    `- 受験予定日: ${profile.examDate || "未設定"}`,
    `- 科目: ${profile.subjects.join("、")}`,
    "- 事実と推測は分けること",
    "- 配点や難易度が不明なら null を使うこと",
    "- 行動に移しやすい学習項目を 3-6 件出すこと",
    "",
    "返却フォーマット:",
    JSON.stringify(aiImportExample, null, 2),
  ].join("\n");
}

function usePersistentState(name, fallback) {
  const [value, setValue] = useState(() => loadJson(name, fallback));
  useEffect(() => {
    saveJson(name, value);
  }, [name, value]);
  return [value, setValue];
}

function useTimerSession() {
  const [session, setSession] = usePersistentState("timer-session", {
    state: "idle",
    subject: defaultProfile.subjects[0],
    elapsedBeforeStart: 0,
    startedAt: null,
  });
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const computeElapsed = () => {
      if (session.state !== "running" || !session.startedAt) {
        setElapsed(session.elapsedBeforeStart);
        return;
      }
      const extra = Math.floor((Date.now() - session.startedAt) / 1000);
      setElapsed(session.elapsedBeforeStart + extra);
    };

    computeElapsed();
    if (session.state === "running") {
      intervalRef.current = window.setInterval(computeElapsed, 1000);
    }

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [session]);

  const actions = {
    selectSubject(subject) {
      setSession((prev) => ({ ...prev, subject }));
    },
    start() {
      setSession((prev) => ({
        ...prev,
        state: "running",
        startedAt: Date.now(),
      }));
    },
    pause() {
      setSession((prev) => ({
        ...prev,
        state: "paused",
        elapsedBeforeStart: elapsed,
        startedAt: null,
      }));
    },
    reset() {
      setSession((prev) => ({
        ...prev,
        state: "idle",
        elapsedBeforeStart: 0,
        startedAt: null,
      }));
      setElapsed(0);
    },
  };

  return { session, elapsed, actions };
}

function MetricCard({ label, value, accent }) {
  return (
    <div className="metric-card" style={{ "--card-accent": accent }}>
      <div className="eyebrow">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function SectionCard({ title, eyebrow, children, actions }) {
  return (
    <section className="section-card">
      <div className="section-head">
        <div>
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <h2>{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ProfileEditor({ profile, setProfile }) {
  function updateField(key, value) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function updateSubjects(value) {
    const next = value
      .split(/[\n,、]/)
      .map((item) => item.trim())
      .filter(Boolean);
    updateField("subjects", next.length ? next : defaultProfile.subjects);
  }

  return (
    <SectionCard
      eyebrow="Settings"
      title="大学別カスタム"
      actions={
        <div className="preset-row">
          {presetProfiles.map((preset) => (
            <button
              key={preset.id}
              className="ghost-button"
              onClick={() => setProfile(preset.profile)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="form-grid">
        <label>
          <span>アプリ名</span>
          <input value={profile.appTitle} onChange={(e) => updateField("appTitle", e.target.value)} />
        </label>
        <label>
          <span>現在の学校</span>
          <input value={profile.currentSchool} onChange={(e) => updateField("currentSchool", e.target.value)} />
        </label>
        <label>
          <span>対象大学</span>
          <input value={profile.targetUniversity} onChange={(e) => updateField("targetUniversity", e.target.value)} />
        </label>
        <label>
          <span>学部・類</span>
          <input value={profile.targetFaculty} onChange={(e) => updateField("targetFaculty", e.target.value)} />
        </label>
        <label>
          <span>受験予定日</span>
          <input type="date" value={profile.examDate} onChange={(e) => updateField("examDate", e.target.value)} />
        </label>
        <label>
          <span>週間テンプレート</span>
          <select value={profile.scheduleStyle} onChange={(e) => updateField("scheduleStyle", e.target.value)}>
            {Object.entries(scheduleTemplates).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
        <label className="full-width">
          <span>科目</span>
          <textarea
            rows={3}
            value={profile.subjects.join("、")}
            onChange={(e) => updateSubjects(e.target.value)}
          />
        </label>
      </div>
    </SectionCard>
  );
}

function AiImport({ profile, importedData, setImportedData }) {
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState("");
  const prompt = useMemo(() => buildAiPrompt(profile), [profile]);

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
  }

  function parseImport() {
    setError("");
    const cleaned = pasteText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    try {
      const parsed = JSON.parse(cleaned);
      setImportedData(parsed);
      setPasteText("");
    } catch {
      setError("JSON として読めませんでした。AI の返答をそのまま貼り付けてください。");
    }
  }

  return (
    <div className="stack">
      <SectionCard
        eyebrow="AI Import"
        title="API なしで AI 情報を取り込む"
        actions={<button className="ghost-button" onClick={copyPrompt}>プロンプトをコピー</button>}
      >
        <p className="section-copy">
          外部 API は使わず、AI に厳密な JSON を返させて、そのままこの画面へ取り込みます。
          大学と学部を変えるだけで使い回せます。
        </p>
        <textarea className="prompt-box" value={prompt} readOnly rows={14} />
      </SectionCard>

      <SectionCard eyebrow="Paste JSON" title="AI の出力を貼り付け">
        <textarea
          className="prompt-box"
          rows={12}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="AI が返した JSON をここに貼り付け"
        />
        <div className="action-row">
          <button className="primary-button" onClick={parseImport}>取り込む</button>
          {importedData ? (
            <button className="ghost-button" onClick={() => setImportedData(null)}>
              AI データを削除
            </button>
          ) : null}
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </SectionCard>
    </div>
  );
}

function Dashboard({ profile, importedData, logs }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayMinutes = logs.filter((entry) => entry.date === today).reduce((sum, entry) => sum + entry.minutes, 0);
  const totalMinutes = logs.reduce((sum, entry) => sum + entry.minutes, 0);
  const upcoming = importedData?.examDate || profile.examDate;
  const actionItems = importedData?.actionItems || profile.goals;

  return (
    <div className="stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow">Mobile Study App</div>
          <h1>{profile.appTitle}</h1>
          <p>
            {profile.currentSchool} の {profile.userType}向けに、{profile.targetUniversity} {profile.targetFaculty}
            の受験戦略をスマホで回すためのローカルアプリ。
          </p>
        </div>
        <div className="metric-grid">
          <MetricCard label="今日の学習" value={formatMinutes(todayMinutes)} accent="#ef7c52" />
          <MetricCard label="累計ログ" value={formatMinutes(totalMinutes)} accent="#2b9d8f" />
          <MetricCard label="受験日" value={dateLabel(upcoming)} accent="#e9c46a" />
        </div>
      </section>

      <SectionCard eyebrow="Current Plan" title="直近の実行項目">
        <div className="bullet-list">
          {actionItems.map((item) => (
            <div key={item} className="bullet-item">
              <span className="bullet-dot" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function Strategy({ profile, importedData }) {
  const difficultyMap = new Map(
    (importedData?.subjectDifficulty || []).map((item) => [item.subject, item])
  );
  const schedule = scheduleTemplates[profile.scheduleStyle] || scheduleTemplates.school;

  return (
    <div className="stack">
      <SectionCard eyebrow="Roadmap" title="合格までの流れ">
        <div className="phase-list">
          {roadmapPhases.map((phase) => (
            <article key={phase.id} className="phase-card" style={{ "--phase-accent": phase.accent }}>
              <div className="phase-top">
                <div>
                  <div className="eyebrow">{phase.months}</div>
                  <h3>{phase.title}</h3>
                </div>
                <div className="phase-line" />
              </div>
              <p>{phase.summary}</p>
              <div className="bullet-list">
                {phase.bullets.map((bullet) => (
                  <div key={bullet} className="bullet-item">
                    <span className="bullet-dot" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Subjects" title="科目別の見立て">
        <div className="subject-grid">
          {profile.subjects.map((subject) => {
            const info = difficultyMap.get(subject);
            return (
              <article key={subject} className="subject-card">
                <div className="subject-head">
                  <h3>{subject}</h3>
                  <span className="level-badge">難度 {info?.level ?? "-"}/5</span>
                </div>
                <p>{info?.comment || "まだ AI 取り込みデータがありません。大学情報を取り込むとここに科目別コメントが出ます。"}</p>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Weekly Template" title={schedule.label}>
        <div className="schedule-list">
          {schedule.blocks.map((block) => (
            <div key={block.slot} className="schedule-row">
              <div className="schedule-time">{block.slot}</div>
              <div>
                <div className="schedule-focus">{block.focus}</div>
                <div className="schedule-detail">{block.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function TimerTab({ profile, logs, setLogs }) {
  const { session, elapsed, actions } = useTimerSession();
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter((entry) => entry.date === today).slice().reverse();

  function stopAndSave() {
    if (elapsed >= 60) {
      const minutes = Math.max(1, Math.round(elapsed / 60));
      setLogs((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          date: today,
          subject: session.subject,
          minutes,
          seconds: elapsed,
        },
      ]);
    }
    actions.reset();
  }

  return (
    <div className="stack">
      <SectionCard eyebrow="Timer" title="学習タイマー">
        <div className="timer-display">{formatDuration(elapsed)}</div>
        <div className="subject-chip-row">
          {profile.subjects.map((subject) => (
            <button
              key={subject}
              className={`chip ${session.subject === subject ? "chip-active" : ""}`}
              onClick={() => actions.selectSubject(subject)}
              disabled={session.state === "running"}
            >
              {subject}
            </button>
          ))}
        </div>
        <div className="action-row">
          {session.state === "idle" ? (
            <button className="primary-button" onClick={actions.start}>開始</button>
          ) : null}
          {session.state === "running" ? (
            <>
              <button className="ghost-button" onClick={actions.pause}>一時停止</button>
              <button className="primary-button" onClick={stopAndSave}>終了して保存</button>
            </>
          ) : null}
          {session.state === "paused" ? (
            <>
              <button className="primary-button" onClick={actions.start}>再開</button>
              <button className="ghost-button" onClick={stopAndSave}>保存</button>
              <button className="ghost-button" onClick={actions.reset}>リセット</button>
            </>
          ) : null}
        </div>
        <p className="section-copy">タイマー状態はローカル保存されるので、画面を閉じても続きから復元できます。</p>
      </SectionCard>

      <SectionCard eyebrow="Today" title="本日の記録">
        {todayLogs.length ? (
          <div className="log-list">
            {todayLogs.map((entry) => (
              <div key={entry.id} className="log-row">
                <strong>{entry.subject}</strong>
                <span>{entry.minutes} 分</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="section-copy">まだ記録がありません。1 分以上計測して保存するとここに反映されます。</p>
        )}
      </SectionCard>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = usePersistentState("tab", "dashboard");
  const [profile, setProfile] = usePersistentState("profile", defaultProfile);
  const [importedData, setImportedData] = usePersistentState("ai-import", null);
  const [logs, setLogs] = usePersistentState("study-logs", []);

  const tabs = [
    { id: "dashboard", label: "概要" },
    { id: "strategy", label: "作戦" },
    { id: "timer", label: "タイマー" },
    { id: "ai", label: "AI取込" },
    { id: "settings", label: "設定" },
  ];

  return (
    <div className="app-shell">
      <div className="mobile-frame" style={{ maxWidth: MOBILE_MAX_WIDTH }}>
        <header className="topbar">
          <div>
            <div className="eyebrow">Local PWA</div>
            <div className="topbar-title">{profile.appTitle}</div>
          </div>
          <div className="topbar-meta">
            <span>{profile.targetUniversity}</span>
            <span>{profile.targetFaculty}</span>
          </div>
        </header>

        <nav className="tabbar">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={`tab-button ${tab === item.id ? "tab-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="content">
          {tab === "dashboard" ? <Dashboard profile={profile} importedData={importedData} logs={logs} /> : null}
          {tab === "strategy" ? <Strategy profile={profile} importedData={importedData} /> : null}
          {tab === "timer" ? <TimerTab profile={profile} logs={logs} setLogs={setLogs} /> : null}
          {tab === "ai" ? <AiImport profile={profile} importedData={importedData} setImportedData={setImportedData} /> : null}
          {tab === "settings" ? <ProfileEditor profile={profile} setProfile={setProfile} /> : null}
        </main>
      </div>
    </div>
  );
}
