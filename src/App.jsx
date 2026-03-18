import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_PREFIX = "todai-plan";

const defaultProfile = {
  title: "合格戦略",
  school: "立川高校",
  university: "東京大学",
  faculty: "文科三類",
  examDate: "2027-02-25",
  subjects: ["英語", "数学", "国語", "世界史", "地理"],
};

const profilePresets = {
  東大: defaultProfile,
  京大: {
    ...defaultProfile,
    school: "任意の高校",
    university: "京都大学",
    faculty: "総合人間学部",
    subjects: ["英語", "数学", "国語", "日本史", "理科基礎"],
  },
  私大: {
    ...defaultProfile,
    school: "任意の高校",
    university: "早稲田大学",
    faculty: "政治経済学部",
    subjects: ["英語", "国語", "日本史", "小論文"],
  },
};

const subjectColors = {
  英語: "#264653",
  数学: "#9b2226",
  国語: "#606c38",
  世界史: "#bc6c25",
  地理: "#1d3557",
  日本史: "#8d5524",
  小論文: "#6b7280",
  理科基礎: "#4a6741",
  情報: "#4a6741",
  復習: "#6b7280",
};

const planPhases = [
  {
    id: "phase-1",
    title: "設計",
    subtitle: "崩れない学習導線を先に作る",
    accent: "#e85d3a",
    items: [
      "大学と学部に合わせて主力科目を固定する",
      "AI から得た情報を JSON で保存して戦略に混ぜる",
      "平日の最小セットを決めてゼロの日を作らない",
    ],
  },
  {
    id: "phase-2",
    title: "演習",
    subtitle: "模試と過去問で失点理由を蓄積する",
    accent: "#2a9d8f",
    items: [
      "週1回は時間を測って解く",
      "タイマー記録から触れていない科目を可視化する",
      "弱点科目の順序を毎週更新する",
    ],
  },
  {
    id: "phase-3",
    title: "直前",
    subtitle: "配点ベースでやることを削る",
    accent: "#e9c46a",
    items: [
      "新しい教材を増やさない",
      "復習メモを次週の計画に転記する",
      "共通テストと二次の切り替え時期を固定する",
    ],
  },
];

const bookTemplates = {
  英語: {
    icon: "EN",
    strategy: "毎日触る主力科目。短時間でも固定で入れる。",
    blocks: [
      { label: "基礎", items: ["単語と音読を固定する", "解釈を毎日少しずつ進める"] },
      { label: "演習", items: ["長文と要約を週1で入れる", "AIコメントで弱点を補正する"] },
    ],
  },
  数学: {
    icon: "MA",
    strategy: "配点を稼ぐ柱。典型問題を速く処理できるようにする。",
    blocks: [
      { label: "基礎", items: ["例題の型を固める", "止まる単元を洗い出す"] },
      { label: "演習", items: ["時間を測って解く", "失点理由を残す"] },
    ],
  },
  国語: {
    icon: "JA",
    strategy: "大崩れしないことが重要。古文漢文の基礎を先に安定させる。",
    blocks: [
      { label: "基礎", items: ["古文単語と文法を回す", "漢文句法を固定する"] },
      { label: "演習", items: ["現代文の読み方を整理する", "記述の型を繰り返す"] },
    ],
  },
  世界史: {
    icon: "WH",
    strategy: "通史と論述を並行で進める。夏以降の伸び幅が大きい。",
    blocks: [
      { label: "基礎", items: ["通史を通す", "一問一答を回す"] },
      { label: "演習", items: ["論述の骨格を作る", "年度別テーマを確認する"] },
    ],
  },
  地理: {
    icon: "GE",
    strategy: "資料読解と論理性を意識する。統計確認を習慣化する。",
    blocks: [
      { label: "基礎", items: ["系統を先に理解する", "地誌で補う"] },
      { label: "演習", items: ["統計を毎週確認する", "短い論述を回す"] },
    ],
  },
  日本史: {
    icon: "JH",
    strategy: "通史の流れとテーマ史を結びつける。",
    blocks: [
      { label: "基礎", items: ["通史を一周する", "文化史を分離して確認する"] },
      { label: "演習", items: ["記述の用語精度を上げる", "頻出テーマを固める"] },
    ],
  },
  小論文: {
    icon: "ES",
    strategy: "素材理解と構成を毎週練習する。",
    blocks: [
      { label: "基礎", items: ["型を決める", "要約練習を入れる"] },
      { label: "演習", items: ["時間を測って書く", "論点整理を反復する"] },
    ],
  },
  理科基礎: {
    icon: "SC",
    strategy: "短期集中で仕上げる。共通テスト向けに範囲を絞る。",
    blocks: [
      { label: "基礎", items: ["頻出単元を先に固める", "公式と用語を整理する"] },
      { label: "演習", items: ["実戦形式を数年分回す", "知識抜けを埋める"] },
    ],
  },
};

const scheduleTemplates = {
  平日: {
    subtitle: "学校がある日の最小構成",
    rows: [
      ["朝 20分", "英語", "単語と音読で立ち上げる"],
      ["放課後 90分", "数学", "重い演習をここに固定する"],
      ["夜 60分", "世界史", "通史か論述を進める"],
      ["寝る前 15分", "復習", "今日の記録と明日の優先順位だけ確認する"],
    ],
  },
  休日: {
    subtitle: "まとまった時間が取れる日",
    rows: [
      ["午前 180分", "英語", "主力科目を先に終わらせる"],
      ["午後 120分", "数学", "時間を測って解く"],
      ["夕方 120分", "国語", "現代文か古典を1題やる"],
      ["夜 60分", "復習", "弱点と次のタスクを整理する"],
    ],
  },
};

const tips = [
  { title: "英語は毎日固定", text: "短時間でも切らさないほうが伸びやすい。" },
  { title: "数学は時間を測る", text: "解けるかより、時間内に解けるかを早めに見る。" },
  { title: "社会は週単位で積む", text: "毎日少しより、週の総量で管理した方が崩れにくい。" },
  { title: "AI 情報はそのまま保存", text: "あとで探し直さないよう JSON で取り込んで戦略に混ぜる。" },
];

const cardStyle = {
  background: "rgba(255,255,255,0.015)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
};

const ghostButton = {
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "transparent",
  color: "#aaa",
  fontSize: 12,
  cursor: "pointer",
  minHeight: 44,
};

const primaryButton = {
  ...ghostButton,
  background: "#e85d3a",
  color: "#fff",
  border: "none",
  fontWeight: 700,
};

const fieldStyle = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
  color: "#f5f5f5",
  padding: "12px 14px",
  boxSizing: "border-box",
};

const bodyWrap = {
  padding: "14px 14px 40px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

function storageKey(name) {
  return `${STORAGE_PREFIX}:${name}`;
}

function load(name, fallback) {
  try {
    const raw = localStorage.getItem(storageKey(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(name, value) {
  try {
    localStorage.setItem(storageKey(name), JSON.stringify(value));
  } catch {
    return;
  }
}

function useStored(name, fallback) {
  const [state, setState] = useState(() => load(name, fallback));
  useEffect(() => save(name, state), [name, state]);
  return [state, setState];
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatClock(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h ? `${String(h).padStart(2, "0")}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Section({ title, children }) {
  return (
    <div style={{ ...cardStyle, padding: 16 }}>
      <div style={{ fontSize: 10, color: "#e85d3a", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function OverviewTab({ profile, ai, logs }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayMinutes = logs.filter((log) => log.date === today).reduce((sum, log) => sum + log.minutes, 0);
  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  const scoreTargets = ai?.scoreTargets || [];
  const actions = ai?.actionItems?.length
    ? ai.actionItems
    : [
        `${profile.university} 向けに主力科目を固定する`,
        "AI 出力をそのまま週次計画へ反映する",
        "ゼロの日を作らない最小セットを決める",
      ];

  return (
    <div style={bodyWrap}>
      <Section title="Overview">
        <div style={{ fontSize: 20, fontWeight: 900, color: "#f5f5f5" }}>
          {profile.university} {profile.faculty}
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
          {profile.school} / 試験日 {formatDate(ai?.examDate || profile.examDate)}
        </div>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          ["今日", `${todayMinutes}m`, "#e85d3a"],
          ["累計", `${totalMinutes}m`, "#2a9d8f"],
          ["AI", ai ? "有" : "無", "#457b9d"],
        ].map(([label, value, color]) => (
          <div key={label} style={{ ...cardStyle, padding: 12, borderColor: `${color}35` }}>
            <div style={{ fontSize: 10, color, fontWeight: 700 }}>{label}</div>
            <div style={{ marginTop: 6, color: "#f5f5f5", fontSize: 20, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      {scoreTargets.length ? (
        <Section title="Score Targets">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {scoreTargets.map((target) => (
              <div key={target.label} style={{ flex: "1 1 90px", padding: 12, borderRadius: 8, background: "rgba(233,196,106,0.08)" }}>
                <div style={{ fontSize: 10, color: "#e9c46a", fontWeight: 700 }}>{target.label}</div>
                <div style={{ marginTop: 4, color: "#f5f5f5", fontSize: 20, fontWeight: 900 }}>{target.value}</div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Immediate Actions">
        {actions.map((action) => (
          <div key={action} style={{ display: "flex", gap: 10, color: "#aaa", fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
            <span style={{ color: "#e85d3a" }}>•</span>
            <span>{action}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function StrategyTab({ ai }) {
  const phases = useMemo(
    () =>
      planPhases.map((phase, index) =>
        index === 0 && ai?.actionItems?.length ? { ...phase, items: ai.actionItems } : phase,
      ),
    [ai],
  );
  const [openId, setOpenId] = useState(phases[0].id);

  return (
    <div style={bodyWrap}>
      {phases.map((phase) => (
        <div key={phase.id} style={{ ...cardStyle, overflow: "hidden", borderColor: openId === phase.id ? `${phase.accent}55` : "rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setOpenId(openId === phase.id ? "" : phase.id)}
            style={{ width: "100%", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", background: "transparent", border: "none", color: "#ddd", textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: phase.accent, boxShadow: `0 0 10px ${phase.accent}66` }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#f5f5f5" }}>{phase.title}</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{phase.subtitle}</div>
            </div>
            <div style={{ color: "#666", transform: openId === phase.id ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}>▾</div>
          </button>
          {openId === phase.id ? (
            <div style={{ padding: "0 16px 16px" }}>
              {phase.items.map((item) => (
                <div key={item} style={{ display: "flex", gap: 10, color: "#aaa", fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
                  <span style={{ color: phase.accent }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function BooksTab({ profile, ai }) {
  const books = profile.subjects.map((subject) => ({
    subject,
    color: subjectColors[subject] || "#666",
    ...(bookTemplates[subject] || {
      icon: subject.slice(0, 2).toUpperCase(),
      strategy: "この大学向けに科目戦略を追加する。",
      blocks: [{ label: "基本", items: ["この科目の戦略を編集する"] }],
    }),
  }));

  const difficultyMap = new Map((ai?.subjectDifficulty || []).map((item) => [item.subject, item]));
  const [openId, setOpenId] = useState(books[0]?.subject || "");

  return (
    <div style={bodyWrap}>
      {books.map((book) => {
        const difficulty = difficultyMap.get(book.subject);
        return (
          <div key={book.subject} style={{ ...cardStyle, overflow: "hidden", borderColor: openId === book.subject ? `${book.color}55` : "rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setOpenId(openId === book.subject ? "" : book.subject)}
              style={{ width: "100%", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", background: "transparent", border: "none", color: "#ddd", textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 6, background: book.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>{book.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#f5f5f5" }}>{book.subject}</div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{book.strategy}</div>
              </div>
              {difficulty ? <div style={{ fontSize: 11, color: "#e9c46a" }}>難度 {difficulty.level}/5</div> : null}
            </button>
            {openId === book.subject ? (
              <div style={{ padding: "0 16px 16px" }}>
                {difficulty ? (
                  <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(233,196,106,0.07)", color: "#aaa", fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
                    {difficulty.comment}
                  </div>
                ) : null}
                {book.blocks.map((block) => (
                  <div key={block.label} style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 10, color: book.color, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{block.label}</div>
                    {block.items.map((item) => (
                      <div key={item} style={{ display: "flex", gap: 10, color: "#aaa", fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
                        <span style={{ color: book.color }}>•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ScheduleTab() {
  const [mode, setMode] = useState("平日");
  const schedule = scheduleTemplates[mode];

  return (
    <div style={bodyWrap}>
      <div style={{ display: "flex", gap: 6 }}>
        {Object.keys(scheduleTemplates).map((key) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            style={{ ...ghostButton, flex: 1, background: mode === key ? "rgba(255,255,255,0.06)" : "transparent", color: mode === key ? "#f5f5f5" : "#666" }}
          >
            {key}
          </button>
        ))}
      </div>
      <Section title="Weekly Template">
        <div style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>{schedule.subtitle}</div>
        {schedule.rows.map(([time, subject, detail]) => (
          <div key={`${time}-${subject}`} style={{ display: "flex", gap: 10, fontSize: 12, marginTop: 8 }}>
            <span style={{ minWidth: 72, color: "#666", fontFamily: "'Courier New', monospace" }}>{time}</span>
            <span style={{ minWidth: 48, color: subjectColors[subject] || "#aaa", fontWeight: 700 }}>{subject}</span>
            <span style={{ color: "#999", lineHeight: 1.5 }}>{detail}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function TimerTab({ profile, logs, setLogs }) {
  const [timer, setTimer] = useStored("timer", {
    subject: defaultProfile.subjects[0],
    running: false,
    base: 0,
    startedAt: null,
  });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => {
      if (!timer.running || !timer.startedAt) {
        setElapsed(timer.base);
        return;
      }
      setElapsed(timer.base + Math.floor((Date.now() - timer.startedAt) / 1000));
    };
    tick();
    if (!timer.running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timer]);

  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter((log) => log.date === today).slice().reverse();

  const stopAndSave = () => {
    if (elapsed >= 60) {
      setLogs((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          date: today,
          subject: timer.subject,
          minutes: Math.max(1, Math.round(elapsed / 60)),
        },
      ]);
    }
    setTimer((prev) => ({ ...prev, running: false, base: 0, startedAt: null }));
    setElapsed(0);
  };

  return (
    <div style={bodyWrap}>
      <Section title="Study Timer">
        <div style={{ textAlign: "center", fontSize: timer.running ? 52 : 46, fontWeight: 900, color: timer.running ? "#f5f5f5" : "#666", fontFamily: "'Courier New', monospace", margin: "6px 0 14px", transition: "all 240ms cubic-bezier(0.34,1.15,0.64,1)" }}>
          {formatClock(elapsed)}
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
          {profile.subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => !timer.running && setTimer((prev) => ({ ...prev, subject }))}
              style={{
                ...ghostButton,
                minHeight: 0,
                padding: "8px 12px",
                color: timer.subject === subject ? subjectColors[subject] || "#ddd" : "#666",
                border: `1px solid ${timer.subject === subject ? `${subjectColors[subject] || "#888"}60` : "rgba(255,255,255,0.06)"}`,
                background: timer.subject === subject ? `${subjectColors[subject] || "#888"}22` : "transparent",
              }}
            >
              {subject}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {!timer.running && elapsed === 0 ? <button onClick={() => setTimer((prev) => ({ ...prev, running: true, startedAt: Date.now() }))} style={primaryButton}>START</button> : null}
          {timer.running ? (
            <>
              <button onClick={() => setTimer((prev) => ({ ...prev, running: false, base: elapsed, startedAt: null }))} style={ghostButton}>PAUSE</button>
              <button onClick={stopAndSave} style={primaryButton}>STOP+SAVE</button>
            </>
          ) : null}
          {!timer.running && elapsed > 0 ? (
            <>
              <button onClick={() => setTimer((prev) => ({ ...prev, running: true, startedAt: Date.now() }))} style={primaryButton}>RESUME</button>
              <button onClick={stopAndSave} style={ghostButton}>SAVE</button>
              <button onClick={() => { setTimer((prev) => ({ ...prev, running: false, base: 0, startedAt: null })); setElapsed(0); }} style={ghostButton}>RESET</button>
            </>
          ) : null}
        </div>
      </Section>

      <Section title="Today">
        {todayLogs.length
          ? todayLogs.map((log) => (
              <div key={log.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.02)", marginTop: 6 }}>
                <span style={{ color: subjectColors[log.subject] || "#aaa", fontWeight: 700 }}>{log.subject}</span>
                <span style={{ color: "#aaa" }}>{log.minutes}min</span>
              </div>
            ))
          : <div style={{ color: "#666", fontSize: 12 }}>まだ記録がありません。</div>}
      </Section>
    </div>
  );
}

function TipsTab() {
  return (
    <div style={bodyWrap}>
      {tips.map((tip) => (
        <Section key={tip.title} title={tip.title}>
          <div style={{ color: "#999", fontSize: 12, lineHeight: 1.7 }}>{tip.text}</div>
        </Section>
      ))}
    </div>
  );
}

function ImportTab({ profile, ai, setAi }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const prompt = useMemo(() => {
    const payload = {
      university: profile.university,
      faculty: profile.faculty,
      examDate: profile.examDate,
      scoreTargets: [{ label: "安全圏", value: 365 }],
      subjectDifficulty: [{ subject: "英語", level: 4, comment: "例: 要約と記述精度が差になる" }],
      actionItems: ["例: 夏までに主力科目の基礎を固定する"],
    };
    return `以下の条件に合わせて、JSON のみを返してください。\n対象大学: ${profile.university}\n学部: ${profile.faculty}\n高校: ${profile.school}\n受験日: ${profile.examDate}\n科目: ${profile.subjects.join("、")}\n\n${JSON.stringify(payload, null, 2)}`;
  }, [profile]);

  const parse = () => {
    setError("");
    try {
      setAi(JSON.parse(text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "")));
      setText("");
    } catch {
      setError("JSON として読めませんでした。");
    }
  };

  return (
    <div style={bodyWrap}>
      <Section title="AI Import">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: "#aaa", fontSize: 12 }}>API なしで取り込む</div>
          <button onClick={() => navigator.clipboard.writeText(prompt)} style={ghostButton}>COPY</button>
        </div>
        <textarea readOnly rows={10} value={prompt} style={{ ...fieldStyle, resize: "vertical" }} />
      </Section>

      <Section title="Paste JSON">
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="ここに JSON を貼る" style={{ ...fieldStyle, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={parse} style={primaryButton}>取り込む</button>
          {ai ? <button onClick={() => setAi(null)} style={ghostButton}>リセット</button> : null}
        </div>
        {error ? <div style={{ color: "#ff9d86", fontSize: 12, marginTop: 8 }}>{error}</div> : null}
      </Section>
    </div>
  );
}

function SettingsTab({ profile, setProfile }) {
  return (
    <div style={bodyWrap}>
      <Section title="University Custom">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(profilePresets).map(([label, value]) => (
            <button key={label} onClick={() => setProfile(value)} style={ghostButton}>{label}</button>
          ))}
        </div>
      </Section>

      <Section title="Profile">
        <div style={{ display: "grid", gap: 10 }}>
          {[
            ["title", "アプリ名"],
            ["school", "学校"],
            ["university", "大学"],
            ["faculty", "学部"],
          ].map(([fieldName, label]) => (
            <label key={fieldName} style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#888" }}>{label}</span>
              <input value={profile[fieldName]} onChange={(e) => setProfile((prev) => ({ ...prev, [fieldName]: e.target.value }))} style={fieldStyle} />
            </label>
          ))}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#888" }}>受験日</span>
            <input type="date" value={profile.examDate} onChange={(e) => setProfile((prev) => ({ ...prev, examDate: e.target.value }))} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#888" }}>科目</span>
            <textarea
              rows={3}
              value={profile.subjects.join("、")}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...prev,
                  subjects: e.target.value.split(/[\n,、]/).map((x) => x.trim()).filter(Boolean).length
                    ? e.target.value.split(/[\n,、]/).map((x) => x.trim()).filter(Boolean)
                    : defaultProfile.subjects,
                }))
              }
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </label>
        </div>
      </Section>
    </div>
  );
}

export default function App() {
  const [tabIndex, setTabIndex] = useStored("tab", 0);
  const [profile, setProfile] = useStored("profile", defaultProfile);
  const [logs, setLogs] = useStored("logs", []);
  const [ai, setAi] = useStored("ai", null);

  const tabs = [
    { num: "01", label: "概要" },
    { num: "02", label: "作戦" },
    { num: "03", label: "科目" },
    { num: "04", label: "予定" },
    { num: "05", label: "タイマー" },
    { num: "06", label: "戦略" },
    { num: "AI", label: "AI取込", special: true },
    { num: "08", label: "設定" },
  ];

  const touchStart = useRef(null);
  const touchLock = useRef(null);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    touchLock.current = null;
    setSwiping(true);
  };

  const onTouchMove = (e) => {
    if (!touchStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (!touchLock.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      touchLock.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (touchLock.current === "x") setOffset(dx * 0.42);
  };

  const onTouchEnd = () => {
    if (touchLock.current === "x" && Math.abs(offset) > 36) {
      if (offset < 0 && tabIndex < tabs.length - 1) setTabIndex((v) => v + 1);
      if (offset > 0 && tabIndex > 0) setTabIndex((v) => v - 1);
    }
    setOffset(0);
    setSwiping(false);
    touchStart.current = null;
    touchLock.current = null;
  };

  let displayOffset = offset;
  if ((tabIndex === 0 && offset > 0) || (tabIndex === tabs.length - 1 && offset < 0)) {
    displayOffset = Math.sign(offset) * Math.sqrt(Math.abs(offset)) * 2.6;
  }

  const panelStyle = {
    width: `${100 / tabs.length}%`,
    flexShrink: 0,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  };

  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", background: "#111", minHeight: "100dvh", color: "#d4d4d4" }}>
      <div style={{ maxWidth: 430, margin: "0 auto", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#111", backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")" }}>
        <header style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
          <div style={{ position: "absolute", top: -20, right: -12, width: 70, height: 70, border: "1px solid rgba(255,255,255,0.04)", transform: "rotate(45deg)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: "#f5f5f5", margin: 0, letterSpacing: -0.5 }}>
              {profile.university} <span style={{ color: "#e85d3a" }}>{profile.title}</span>
            </h1>
            <span style={{ fontSize: 9, color: "#e85d3a", border: "1px solid #e85d3a", borderRadius: 2, padding: "2px 5px", fontWeight: 700, letterSpacing: 1 }}>MOBILE</span>
            {ai ? <span style={{ marginLeft: "auto", fontSize: 9, color: "#2a9d8f", border: "1px solid #2a9d8f", borderRadius: 2, padding: "2px 5px", fontWeight: 700, letterSpacing: 1 }}>AI 取込済</span> : null}
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 10, color: "#666" }}>{profile.school} / {profile.faculty} / {formatDate(profile.examDate)}</p>
          <div style={{ display: "flex", gap: 3 }}>{["#e85d3a", "#2a9d8f", "#e9c46a", "#457b9d"].map((color, index) => <div key={color} style={{ flex: index === 1 ? 2 : 1, height: 2, background: color, borderRadius: 2, opacity: 0.8 }} />)}</div>
        </header>

        <nav style={{ display: "flex", padding: "0 4px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              onClick={() => setTabIndex(index)}
              style={{
                flex: "0 0 auto",
                minWidth: "20%",
                padding: "10px 6px 8px",
                background: "transparent",
                border: "none",
                borderBottom: tabIndex === index ? `2px solid ${tab.special ? "#2a9d8f" : "#e85d3a"}` : "2px solid transparent",
                color: tabIndex === index ? "#f5f5f5" : "#666",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              <span style={{ display: "block", fontSize: 8, color: tabIndex === index ? (tab.special ? "#2a9d8f" : "#e85d3a") : "#444", marginBottom: 1 }}>{tab.num}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div
            style={{
              display: "flex",
              width: `${tabs.length * 100}%`,
              height: "100%",
              transform: `translateX(calc(-${tabIndex * (100 / tabs.length)}% + ${displayOffset}px))`,
              transition: swiping ? "none" : "transform 320ms cubic-bezier(0.34,1.15,0.64,1)",
            }}
          >
            <div style={panelStyle}><OverviewTab profile={profile} ai={ai} logs={logs} /></div>
            <div style={panelStyle}><StrategyTab profile={profile} ai={ai} /></div>
            <div style={panelStyle}><BooksTab profile={profile} ai={ai} /></div>
            <div style={panelStyle}><ScheduleTab /></div>
            <div style={panelStyle}><TimerTab profile={profile} logs={logs} setLogs={setLogs} /></div>
            <div style={panelStyle}><TipsTab /></div>
            <div style={panelStyle}><ImportTab profile={profile} ai={ai} setAi={setAi} /></div>
            <div style={panelStyle}><SettingsTab profile={profile} setProfile={setProfile} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
