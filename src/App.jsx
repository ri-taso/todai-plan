import { useState, useEffect, useRef, useCallback } from "react";

/* ━━━ Persistent Storage helpers ━━━ */
async function loadData(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
}
async function saveData(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

/* ━━━ Data ━━━ */
const phaseTimeline = [
  { id:"p1", months:"3月〜5月中旬", label:"種まき期", subtitle:"SAT/AP + 学校優先。東大は1日1時間だけ", color:"#e85d3a", hours:"1h/日",
    priorities:[{s:"英語",t:"英文解釈（基本はここだ!）を毎日30分。SATと相乗効果あり",w:45},{s:"古文単語",t:"寝る前15〜20分で古文単語315を10語ずつ",w:30},{s:"世界史",t:"隙間時間にYouTube（ムンディ先生）聞き流し",w:25}],
    tip:"1時間でも毎日続けることが大事。数学はこの期間は捨ててOK。SATの英語が東大の読解力に直結してる。" },
  { id:"p2", months:"5月中旬〜7月中旬", label:"助走期", subtitle:"SAT/AP終了。立川高校に通いつつ放課後3〜4時間で本格始動", color:"#2a9d8f", hours:"3〜4h/日",
    priorities:[{s:"数学",t:"青チャートIA・IIB例題を放課後に毎日1時間",w:30},{s:"英語",t:"技術70 → ポレポレ。東大英語の過去問を1年分見る",w:25},{s:"世界史",t:"ナビゲーター世界史（1巻 → 2巻）",w:25},{s:"国語",t:"古典文法 + 漢文早覚え速答法",w:20}],
    tip:"学校生活のリズムの中で勉強習慣を作る。完全にゼロの日は作らない。" },
  { id:"p3", months:"7月中旬〜8月末", label:"夏休み集中期", subtitle:"最大のチャンス。1日10〜12時間フル稼働", color:"#e9c46a", hours:"10〜12h/日",
    priorities:[{s:"世界史",t:"ナビゲーター全4巻を2周。論述練習帳に着手",w:25},{s:"地理",t:"村瀬のゼロからわかる地理B（系統 → 地誌）を一気に",w:25},{s:"数学",t:"文系数学プラチカ全問2周",w:20},{s:"英語",t:"ポレポレ完成 → 英作文ハイパートレーニング",w:15},{s:"国語",t:"入試現代文アクセス + 得点奪取古文漢文",w:15}],
    tip:"約6週間の夏休みが最大の勝負。8月の東大模試を最初の目標に。" },
  { id:"p4", months:"9月〜12月", label:"学校と両立しながら演習", subtitle:"平日は放課後4〜5時間、土日は8〜10時間", color:"#e76f51", hours:"平日4〜5h / 休日8〜10h",
    priorities:[{s:"全科目",t:"東大過去問（27カ年）を回す",w:30},{s:"世界史",t:"大論述を週2回。100題で知識穴埋め",w:20},{s:"地理",t:"実力100題 + 過去問",w:15},{s:"共テ対策",t:"12月から理科基礎（物理+化学）・情報Iの対策開始",w:35}],
    tip:"秋の東大模試でC判定以上を狙う。過去問は「解く → 分析 → 類題」を徹底。" },
  { id:"p5", months:"1月〜2月", label:"直前期", subtitle:"冬休み + 直前期。受験に全振り", color:"#457b9d", hours:"10〜12h/日",
    priorities:[{s:"共通テスト",t:"共テ予想問題パック・過去問で最終調整",w:40},{s:"二次対策",t:"東大二次の過去問をひたすら解く",w:40},{s:"体調管理",t:"睡眠・食事・軽い運動",w:20}],
    tip:"新しい参考書には絶対手を出さない。復習と過去問だけ。" },
];

const books = {
  english:{name:"英語",icon:"EN",color:"#264653",accent:"#2a9d8f",
    strategy:"最大の武器。120点中80〜90点を狙う。留学経験でリスニング・英作文は有利。読解・和訳・要約の「型」を鍛える。",
    phases:[{period:"3〜5月",items:[{n:"英文読解入門 基本はここだ!",d:"2週間で1周"},{n:"英文解釈の技術70",d:"助走期に1ヶ月で1周"}]},{period:"6〜9月",items:[{n:"ポレポレ英文読解プロセス50",d:"3周する"},{n:"英作文ハイパートレーニング 自由英作文編",d:"型を覚える"}]},{period:"10〜2月",items:[{n:"東大の英語 27カ年",d:"過去問最優先"},{n:"キムタツの東大英語リスニング",d:"形式慣れ"}]}]},
  math:{name:"数学",icon:"MA",color:"#9b2226",accent:"#e76f51",
    strategy:"理系経験を活かす。4完中2〜3完（40〜60点/80点）が目標。確率・微積・整数が頻出。",
    phases:[{period:"5〜7月",items:[{n:"青チャート 数学IA・IIB（例題のみ）",d:"復習ペースで"}]},{period:"7〜9月",items:[{n:"文系数学の良問プラチカ",d:"夏休みで全問2周"},{n:"1対1対応の演習",d:"苦手分野だけ"}]},{period:"10〜2月",items:[{n:"東大の文系数学 27カ年",d:"過去問"}]}]},
  japanese:{name:"国語",icon:"JA",color:"#606c38",accent:"#283618",
    strategy:"大崩れしないことが目標。古文漢文の基礎を固めて安定させる。",
    phases:[{period:"3〜6月",items:[{n:"古文単語315",d:"毎日10語"},{n:"富井の古典文法をはじめからていねいに",d:"2週間で1周"},{n:"漢文早覚え速答法",d:"1〜2週間"}]},{period:"7〜9月",items:[{n:"入試現代文へのアクセス 基本→発展",d:"読み方の型"},{n:"得点奪取 古文・漢文",d:"記述力"}]},{period:"10〜2月",items:[{n:"東大の国語 27カ年",d:"第1問と第4問に注力"}]}]},
  worldHistory:{name:"世界史",icon:"WH",color:"#bc6c25",accent:"#dda15e",
    strategy:"暗記量最大。通史を何周できるかが勝負。タテとヨコを意識。",
    phases:[{period:"3〜6月",items:[{n:"YouTube ムンディ先生の世界史",d:"聞き流しで全体像"},{n:"ナビゲーター世界史 全4巻",d:"助走期から"}]},{period:"7〜9月",items:[{n:"ナビゲーター世界史（2周目）+ 教科書",d:"夏休みで2周"},{n:"世界史論述練習帳",d:"大論述の型"}]},{period:"10〜2月",items:[{n:"実力をつける世界史100題",d:"知識穴埋め"},{n:"東大の世界史 27カ年",d:"週2回論述"}]}]},
  geography:{name:"地理",icon:"GE",color:"#1d3557",accent:"#457b9d",
    strategy:"夏休みから始めても間に合う。理系的思考で「なぜ」を理解すれば暗記量は少ない。",
    phases:[{period:"7〜8月",items:[{n:"村瀬のゼロからわかる地理B 系統地理編",d:"メカニズム理解"},{n:"村瀬のゼロからわかる地理B 地誌編",d:"世界史と重なる部分多い"}]},{period:"9〜11月",items:[{n:"実力をつける地理100題",d:"論述対策含む"},{n:"地理統計要覧",d:"頻出データ暗記"}]},{period:"12〜2月",items:[{n:"東大の地理 27カ年",d:"論理的に書く練習"}]}]},
  science:{name:"理科基礎 + 情報",icon:"SC",color:"#4a6741",accent:"#6b8f64",
    strategy:"共テ専用。二次には出ない。物理基礎+化学基礎は理系経験があるから12月からでも8〜9割狙える。情報Iも短期集中で。",
    phases:[{period:"12月",items:[{n:"きめる! 共通テスト物理基礎",d:"理系経験ありなら1〜2週間で仕上がる"},{n:"きめる! 共通テスト化学基礎",d:"同上。忘れてる部分だけ重点的に"},{n:"高校の情報Iが1冊でしっかりわかる本",d:"情報Iは新課程。1〜2週間で基礎を入れる"}]},{period:"1月（共テ直前）",items:[{n:"共通テスト過去問・予想問題パック",d:"物基・化基・情報Iを実戦形式で。各科目3〜5年分"}]}]},
};

const weeklySchedules = {
  satPeriod:{label:"3〜5月中旬（SAT/AP期間）",sub:"学校 + SAT/AP後の1時間だけ",
    days:[{day:"平日",slots:[{t:"夜 30min",s:"英語",d:"基本はここだ! 2〜3テーマ"},{t:"寝る前 15min",s:"古文単語",d:"10語暗記 + 前日復習"},{t:"隙間時間",s:"世界史",d:"ムンディ先生聞き流し"}]},
      {day:"土曜",slots:[{t:"メイン",s:"SAT/AP",d:"テスト対策"},{t:"空き30min",s:"英語",d:"解釈の続き"},{t:"寝る前",s:"古文単語",d:"週の復習"}]},
      {day:"日曜",slots:[{t:"メイン",s:"SAT/AP",d:"テスト対策"},{t:"空き30min",s:"英語",d:"今週の復習"},{t:"寝る前",s:"古文単語",d:"暗記の続き"}]}]},
  schoolTerm:{label:"学期中（5月中旬〜 / 9月〜12月）",sub:"放課後3〜5時間 + 土日。通学時間も活用。",
    days:[{day:"平日",slots:[{t:"通学中",s:"世界史",d:"聞き流し or 一問一答"},{t:"放課後 1.5h",s:"数学/英語",d:"月水金=数学 / 火木=英語"},{t:"夕食後 1.5h",s:"世界史/地理",d:"月水金=世界史 / 火木=地理"},{t:"寝る前 30min",s:"国語",d:"古文・漢文・現代文を交互に"}]},
      {day:"土曜",slots:[{t:"午前 3h",s:"数学",d:"問題集 or 過去問"},{t:"午後 3h",s:"世界史",d:"通史 or 論述"},{t:"夕方 2h",s:"英語",d:"長文 or 過去問"}]},
      {day:"日曜",slots:[{t:"午前 3h",s:"地理",d:"論述 or 統計"},{t:"午後 3h",s:"国語",d:"過去問演習"},{t:"夕方 2h",s:"弱点補強",d:"遅れてる科目に集中"}]}]},
  vacation:{label:"夏休み / 冬休み",sub:"1日10〜12時間フル稼働",
    days:[{day:"月・水・金",slots:[{t:"7:00-8:30",s:"英語",d:"解釈 / 英作文"},{t:"9:00-12:00",s:"数学",d:"プラチカ or 過去問"},{t:"13:00-15:30",s:"世界史",d:"通史 / 論述"},{t:"16:00-18:00",s:"地理",d:"系統 / 地誌"},{t:"19:00-21:00",s:"国語",d:"現古漢"},{t:"21:30-22:30",s:"復習",d:"暗記・弱点"}]},
      {day:"火・木・土",slots:[{t:"7:00-8:30",s:"英語",d:"リスニング / 長文"},{t:"9:00-12:00",s:"世界史",d:"集中読み込み"},{t:"13:00-15:30",s:"数学",d:"苦手 / 過去問"},{t:"16:00-18:00",s:"国語",d:"記述演習"},{t:"19:00-21:00",s:"地理",d:"統計 / 論述"},{t:"21:30-22:30",s:"復習",d:"振り返り"}]},
      {day:"日曜",slots:[{t:"午前",s:"弱点補強",d:"遅れてる科目"},{t:"午後",s:"過去問",d:"実戦形式"},{t:"夕方",s:"計画",d:"翌週の準備"}]}]},
};

const sColorMap={"英語":"#264653","数学":"#9b2226","世界史":"#bc6c25","国語":"#606c38","地理":"#1d3557","復習":"#555","SAT/AP":"#264653","古文単語":"#606c38","弱点補強":"#555","過去問":"#555","計画":"#555","全科目":"#555","共テ対策":"#264653","体調管理":"#2a9d8f","共通テスト":"#264653","二次対策":"#9b2226","数学/英語":"#4a4a4a","世界史/地理":"#4a4a4a","理科基礎":"#4a6741","情報":"#4a6741"};

const tips=[
  {title:"英語は「調整」だけで武器になる",c:"リスニングと英作文は留学経験でアドバンテージあり。要約・和訳の「型」を覚えるだけで120点中80〜90点が見える。最もコスパが高い。"},
  {title:"数学は文系の中での武器",c:"理系経験者が文系数学を解くのはかなり有利。プラチカ2周で4問中2〜3問安定。ここで稼いだ点が合否を分ける。"},
  {title:"1日1時間でも「ゼロ」とは天と地の差",c:"SAT/AP期間は1時間が限界。でも英文解釈と古文単語をコツコツ積むと、7月時点で全然違う。"},
  {title:"学校との両立は「通学時間」が鍵",c:"通学中にムンディ先生を聞く、一問一答を回す。この積み重ねが一番効く。放課後は集中力の高い科目を優先。"},
  {title:"夏休みが最大にして最後のチャンス",c:"学校がある期間は3〜5時間が限界。夏休みの6週間だけが10〜12時間使える。地理を仕上げ、世界史2周、プラチカを終わらせる。"},
  {title:"合格の鍵は英語 x 数学",c:"英語120 + 数学80 = 200点。140〜150点取れれば、残り240点中190〜220点で合格ライン（340〜360点）に届く。"},
  {title:"模試は「受ける」こと自体に意味がある",c:"独学最大のリスクは自分の位置がわからないこと。8月の東大模試、E判定でも受ける。"},
  {title:"学校の授業を受験に活かす",c:"立川高校は進学校。英語・数学・国語の授業は東大対策の土台になる部分もある。使える部分は使う。"},
  {title:"理科基礎は12月からで間に合う",c:"物理基礎+化学基礎は理系経験があるから短期決戦で十分。12月に参考書を1冊ずつ回して、1月に過去問を数年分やれば8〜9割は取れる。情報Iも同時期に2週間で仕上げる。"},
];

/* ━━━ AI Import prompt template ━━━ */
const AI_IMPORT_PROMPT = `以下の形式でJSONのみを出力してください。余計な説明やマークダウンの記号（\`\`\`等）は一切不要です。

{
  "year": "2024",
  "examDate": "2024年2月25日",
  "passingScore": {
    "文科一類": 340,
    "文科二類": 330,
    "文科三類": 320
  },
  "subjectDifficulty": {
    "英語": { "level": 3, "comment": "例：要約問題が例年より難化。リスニングは標準。" },
    "数学": { "level": 4, "comment": "例：確率・微積が出題。記述は丁寧さが必要。" },
    "国語": { "level": 3, "comment": "例：現代文は抽象度高め。古文は標準的。" },
    "世界史": { "level": 4, "comment": "例：大論述は近現代が中心。知識の応用力が問われた。" },
    "地理": { "level": 3, "comment": "例：統計問題が増加。論述はデータ読解力が必須。" }
  },
  "totalScore": 440,
  "commonTestCutoff": 110,
  "notes": "例：今年は全体的に記述力重視。英語の要約が例年より字数多め。"
}

levelは1〜5の難易度です（1=易, 3=標準, 5=超難）。
上記は例です。実際の最新の東京大学文科の入試情報に置き換えて出力してください。`;

const noiseSvg=`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;
const dotPat=`url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='0.8' fill='rgba(255,255,255,0.04)'/%3E%3C/svg%3E")`;

function FadeIn({children,delay=0,style={}}){
  const[v,setV]=useState(false);const ref=useRef(null);
  useEffect(()=>{const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setV(true);obs.disconnect();}},{threshold:0.08});if(ref.current)obs.observe(ref.current);return()=>obs.disconnect();},[]);
  return <div ref={ref} style={{opacity:v?1:0,transform:v?"translateY(0) scale(1)":"translateY(8px) scale(0.985)",transition:`opacity 150ms cubic-bezier(.25,.46,.45,.94) ${delay}ms, transform 180ms cubic-bezier(.25,.46,.45,.94) ${delay}ms`,...style}}>{children}</div>;
}

function ProgressBar({items}){
  const total=items.reduce((s,i)=>s+i.w,0);
  return <div style={{display:"flex",borderRadius:"4px",overflow:"hidden",height:"6px",background:"rgba(255,255,255,0.06)",gap:"2px"}}>{items.map((item,i)=><div key={i} style={{width:`${(item.w/total)*100}%`,background:sColorMap[item.s]||"#666",borderRadius:"2px"}}/>)}</div>;
}

/* ━━━ Difficulty Stars ━━━ */
function DifficultyStars({level}){
  return(
    <span style={{display:"inline-flex",gap:"2px"}}>
      {[1,2,3,4,5].map(i=>(
        <span key={i} style={{fontSize:"10px",color:i<=level?"#e9c46a":"#333"}}>★</span>
      ))}
    </span>
  );
}

/* ━━━ AI Import Tab ━━━ */
function AIImportTab({importedData, onImport}){
  const[step,setStep]=useState(importedData?"done":"intro"); // intro | prompt | paste | done
  const[pasteText,setPasteText]=useState("");
  const[error,setError]=useState("");
  const[copied,setCopied]=useState(false);

  const handleCopy=()=>{
    navigator.clipboard.writeText(AI_IMPORT_PROMPT).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false),2000);
      setStep("paste");
    });
  };

  const handleParse=()=>{
    setError("");
    let text=pasteText.trim();
    // strip markdown fences if present
    text=text.replace(/^```json\s*/,"").replace(/^```\s*/,"").replace(/\s*```$/,"");
    try{
      const data=JSON.parse(text);
      if(!data.year||!data.subjectDifficulty){
        setError("形式が正しくないようです。もう一度AIに聞いてみてください。");
        return;
      }
      onImport(data);
      setStep("done");
      saveData("ai-import",data);
    }catch(e){
      setError("JSONの解析に失敗しました。AIの出力をそのままコピーして貼り付けてください。");
    }
  };

  const handleReset=()=>{
    setStep("intro");
    setPasteText("");
    setError("");
    onImport(null);
    saveData("ai-import",null);
  };

  const boxStyle={background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"10px",padding:"16px"};

  if(step==="done"&&importedData){
    const d=importedData;
    return(
      <div style={{padding:"16px 18px 40px",display:"flex",flexDirection:"column",gap:"10px"}}>
        <FadeIn>
          <div style={{...boxStyle,borderColor:"rgba(42,157,143,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
              <div>
                <div style={{fontSize:"11px",color:"#2a9d8f",fontWeight:"700",letterSpacing:"1px",textTransform:"uppercase"}}>取込済み</div>
                <div style={{fontSize:"18px",fontWeight:"800",color:"#f5f5f5",marginTop:"2px"}}>{d.year}年 東大入試</div>
              </div>
              <button onClick={handleReset} style={{padding:"6px 12px",borderRadius:"6px",border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#666",fontSize:"11px",cursor:"pointer"}}>リセット</button>
            </div>
            {d.examDate&&<div style={{fontSize:"12px",color:"#888",marginBottom:"8px"}}>試験日：{d.examDate}</div>}
            {d.notes&&<div style={{padding:"10px 12px",borderRadius:"6px",background:"rgba(233,196,106,0.08)",borderLeft:"3px solid #e9c46a55",fontSize:"12px",color:"#aaa",lineHeight:"1.6",marginBottom:"12px"}}>{d.notes}</div>}
          </div>
        </FadeIn>

        {/* Passing scores */}
        {d.passingScore&&(
          <FadeIn delay={40}>
            <div style={boxStyle}>
              <div style={{fontSize:"10px",color:"#e85d3a",fontWeight:"700",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"10px"}}>合格最低点</div>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                {Object.entries(d.passingScore).map(([k,v])=>(
                  <div key={k} style={{flex:"1 1 80px",background:"rgba(232,93,58,0.08)",border:"1px solid rgba(232,93,58,0.2)",borderRadius:"8px",padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:"10px",color:"#e85d3a",fontWeight:"700",marginBottom:"4px"}}>{k}</div>
                    <div style={{fontSize:"22px",fontWeight:"800",color:"#f5f5f5",fontFamily:"'Courier New',monospace"}}>{v}</div>
                    {d.totalScore&&<div style={{fontSize:"9px",color:"#555",marginTop:"2px"}}>/ {d.totalScore}</div>}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {/* Subject difficulty */}
        {d.subjectDifficulty&&(
          <FadeIn delay={80}>
            <div style={boxStyle}>
              <div style={{fontSize:"10px",color:"#e9c46a",fontWeight:"700",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"10px"}}>科目別難易度</div>
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {Object.entries(d.subjectDifficulty).map(([subj,info])=>(
                  <div key={subj} style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
                    <div style={{minWidth:"48px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:sColorMap[subj]||"#ccc"}}>{subj}</div>
                      <DifficultyStars level={info.level}/>
                    </div>
                    <div style={{fontSize:"11px",color:"#888",lineHeight:"1.6",flex:1}}>{info.comment}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {d.commonTestCutoff&&(
          <FadeIn delay={120}>
            <div style={{...boxStyle,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"12px",color:"#888"}}>共通テスト足切り</div>
              <div style={{fontSize:"20px",fontWeight:"800",color:"#457b9d",fontFamily:"'Courier New',monospace"}}>{d.commonTestCutoff}<span style={{fontSize:"11px",color:"#555",marginLeft:"2px"}}>点</span></div>
            </div>
          </FadeIn>
        )}
      </div>
    );
  }

  return(
    <div style={{padding:"16px 18px 40px",display:"flex",flexDirection:"column",gap:"12px"}}>
      {/* Header */}
      <FadeIn>
        <div style={{...boxStyle,borderColor:"rgba(232,93,58,0.2)",textAlign:"center",padding:"20px 16px"}}>
          <div style={{fontSize:"28px",marginBottom:"8px"}}>🤖</div>
          <div style={{fontSize:"16px",fontWeight:"800",color:"#f5f5f5",marginBottom:"6px"}}>AI 情報インポート</div>
          <p style={{margin:0,fontSize:"12px",color:"#777",lineHeight:"1.7"}}>
            ChatGPT・Gemini・Claudeなどに<br/>東大入試情報を聞いて、<br/>そのまま取り込めます。
          </p>
        </div>
      </FadeIn>

      {/* Steps */}
      <FadeIn delay={40}>
        <div style={boxStyle}>
          <div style={{fontSize:"10px",color:"#e85d3a",fontWeight:"700",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"12px"}}>使い方</div>
          {[
            {num:"01",label:"プロンプトをコピー",desc:"下のボタンでコピー"},
            {num:"02",label:"AIに貼り付けて送信",desc:"ChatGPT・Gemini等に貼る"},
            {num:"03",label:"出力をコピー",desc:"AIの返答をまるごとコピー"},
            {num:"04",label:"ここに貼り付け",desc:"自動で解析・表示します"},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:"12px",alignItems:"flex-start",marginBottom:i<3?"10px":0}}>
              <div style={{fontSize:"10px",color:"#e85d3a",fontWeight:"800",minWidth:"20px",marginTop:"1px"}}>{s.num}</div>
              <div>
                <div style={{fontSize:"12px",fontWeight:"700",color:"#ddd"}}>{s.label}</div>
                <div style={{fontSize:"11px",color:"#666"}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Copy prompt button */}
      <FadeIn delay={80}>
        <button
          onClick={handleCopy}
          style={{
            width:"100%",padding:"16px",borderRadius:"10px",border:"none",
            background:copied?"rgba(42,157,143,0.2)":"rgba(232,93,58,0.15)",
            borderTop:`1px solid ${copied?"#2a9d8f40":"#e85d3a40"}`,
            color:copied?"#2a9d8f":"#e85d3a",fontSize:"14px",fontWeight:"700",cursor:"pointer",
            transition:"all 200ms ease-out",
            display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",
          }}>
          {copied?"✓ コピーしました！":"📋 プロンプトをコピー"}
        </button>
      </FadeIn>

      {/* Paste area — show after copy */}
      {(step==="paste"||pasteText)&&(
        <FadeIn>
          <div style={boxStyle}>
            <div style={{fontSize:"11px",color:"#888",marginBottom:"8px",fontWeight:"600"}}>AIの出力をここに貼り付け</div>
            <textarea
              value={pasteText}
              onChange={e=>setPasteText(e.target.value)}
              placeholder={"{\n  \"year\": \"2024\",\n  ...\n}"}
              style={{
                width:"100%",minHeight:"120px",background:"rgba(0,0,0,0.3)",
                border:"1px solid rgba(255,255,255,0.08)",borderRadius:"6px",
                color:"#ccc",fontSize:"11px",padding:"10px",fontFamily:"'Courier New',monospace",
                resize:"vertical",boxSizing:"border-box",outline:"none",lineHeight:"1.5",
              }}
            />
            {error&&<div style={{fontSize:"11px",color:"#e85d3a",marginTop:"6px",lineHeight:"1.5"}}>{error}</div>}
            <button
              onClick={handleParse}
              disabled={!pasteText.trim()}
              style={{
                width:"100%",marginTop:"10px",padding:"14px",borderRadius:"8px",border:"none",
                background:pasteText.trim()?"#2a9d8f":"rgba(255,255,255,0.05)",
                color:pasteText.trim()?"#fff":"#444",fontSize:"13px",fontWeight:"700",
                cursor:pasteText.trim()?"pointer":"default",transition:"all 200ms ease-out",
              }}>
              取り込む →
            </button>
          </div>
        </FadeIn>
      )}

      {/* Show paste area button if not yet shown */}
      {step==="intro"&&!pasteText&&(
        <FadeIn delay={100}>
          <button
            onClick={()=>setStep("paste")}
            style={{
              width:"100%",padding:"14px",borderRadius:"10px",
              border:"1px solid rgba(255,255,255,0.07)",background:"transparent",
              color:"#666",fontSize:"12px",cursor:"pointer",
            }}>
            貼り付けエリアを表示
          </button>
        </FadeIn>
      )}
    </div>
  );
}

/* ━━━ Timer Component ━━━ */
function StudyTimer({onLog}){
  const[state,setState]=useState("idle");
  const[elapsed,setElapsed]=useState(0);
  const[subject,setSubject]=useState("英語");
  const[laps,setLaps]=useState([]);
  const intervalRef=useRef(null);
  const lastLapRef=useRef(0);

  useEffect(()=>{
    if(state==="running"){intervalRef.current=setInterval(()=>setElapsed(e=>e+1),1000);}
    else{clearInterval(intervalRef.current);}
    return()=>clearInterval(intervalRef.current);
  },[state]);

  const fmt=(s)=>{const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);const sec=s%60;return `${h>0?h+":":""}${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;};
  const handleStart=()=>{setState("running");lastLapRef.current=0;};
  const handlePause=()=>{setState("paused");};
  const handleResume=()=>{setState("running");};
  const handleLap=()=>{const lapTime=elapsed-lastLapRef.current;setLaps(prev=>[...prev,{label:`LAP ${prev.length+1}`,time:lapTime,total:elapsed}]);lastLapRef.current=elapsed;};
  const handleStop=()=>{setState("idle");if(elapsed>30){onLog({subject,minutes:Math.round(elapsed/60),seconds:elapsed,date:new Date().toISOString().slice(0,10),laps:[...laps]});}setElapsed(0);setLaps([]);lastLapRef.current=0;};
  const handleReset=()=>{setState("idle");setElapsed(0);setLaps([]);lastLapRef.current=0;};
  const subjects=["英語","数学","世界史","国語","地理","理科基礎"];

  return(
    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",padding:"20px",textAlign:"center"}}>
      <div style={{fontSize:"11px",color:"#666",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"12px"}}>Study Timer</div>
      <div style={{display:"flex",gap:"4px",justifyContent:"center",marginBottom:"16px",flexWrap:"wrap"}}>
        {subjects.map(s=>(
          <button key={s} onClick={()=>state==="idle"&&setSubject(s)} style={{
            padding:"7px 12px",borderRadius:"4px",fontSize:"12px",fontWeight:"600",cursor:state==="idle"?"pointer":"default",
            background:subject===s?`${sColorMap[s]}25`:"transparent",
            border:`1px solid ${subject===s?sColorMap[s]+"60":"rgba(255,255,255,0.06)"}`,
            color:subject===s?sColorMap[s]||"#ccc":"#555",
            opacity:state!=="idle"&&subject!==s?0.3:1,
            transition:"all 200ms ease-out",minWidth:"44px",
          }}>{s}</button>
        ))}
      </div>
      <div style={{fontSize:state!=="idle"?"52px":"44px",fontWeight:"800",color:state==="running"?"#f5f5f5":state==="paused"?"#e85d3a":"#444",fontFamily:"'Courier New',monospace",letterSpacing:"2px",transition:"all 250ms cubic-bezier(.25,.46,.45,.94)",margin:"8px 0 6px"}}>{fmt(elapsed)}</div>
      {laps.length>0&&state!=="idle"&&<div style={{fontSize:"13px",color:"#666",fontFamily:"'Courier New',monospace",marginBottom:"12px"}}>LAP {laps.length+1}: {fmt(elapsed-lastLapRef.current)}</div>}
      {laps.length===0&&state!=="idle"&&<div style={{height:"12px",marginBottom:"12px"}}/>}
      <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
        {state==="idle"&&<button onClick={handleStart} style={{padding:"14px 40px",borderRadius:"8px",border:"none",background:"#e85d3a",color:"#fff",fontSize:"15px",fontWeight:"700",cursor:"pointer",minWidth:"44px",minHeight:"44px"}}>START</button>}
        {state==="running"&&<>
          <button onClick={handleLap} style={{padding:"14px 20px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#aaa",fontSize:"13px",fontWeight:"600",cursor:"pointer",minHeight:"44px"}}>LAP</button>
          <button onClick={handlePause} style={{padding:"14px 20px",borderRadius:"8px",border:"1px solid #e9c46a50",background:"#e9c46a18",color:"#e9c46a",fontSize:"13px",fontWeight:"700",cursor:"pointer",minHeight:"44px"}}>PAUSE</button>
          <button onClick={handleStop} style={{padding:"14px 20px",borderRadius:"8px",border:"none",background:"#e85d3a",color:"#fff",fontSize:"13px",fontWeight:"700",cursor:"pointer",minHeight:"44px"}}>STOP</button>
        </>}
        {state==="paused"&&<>
          <button onClick={handleResume} style={{padding:"14px 24px",borderRadius:"8px",border:"none",background:"#2a9d8f",color:"#fff",fontSize:"13px",fontWeight:"700",cursor:"pointer",minHeight:"44px"}}>RESUME</button>
          <button onClick={handleStop} style={{padding:"14px 20px",borderRadius:"8px",border:"none",background:"#e85d3a",color:"#fff",fontSize:"13px",fontWeight:"700",cursor:"pointer",minHeight:"44px"}}>STOP+SAVE</button>
          <button onClick={handleReset} style={{padding:"14px 16px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#666",fontSize:"12px",fontWeight:"600",cursor:"pointer",minHeight:"44px"}}>RESET</button>
        </>}
      </div>
      {laps.length>0&&(
        <div style={{marginTop:"16px",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"12px"}}>
          <div style={{fontSize:"10px",color:"#555",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"8px"}}>Laps</div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {laps.slice().reverse().map((lap,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",borderRadius:"4px",background:"rgba(255,255,255,0.015)",fontSize:"12px"}}>
                <span style={{color:"#888",fontWeight:"600"}}>{lap.label}</span>
                <span style={{display:"flex",gap:"16px"}}>
                  <span style={{color:"#aaa",fontFamily:"'Courier New',monospace"}}>{fmt(lap.time)}</span>
                  <span style={{color:"#555",fontFamily:"'Courier New',monospace",fontSize:"11px"}}>{fmt(lap.total)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StudyLog({logs}){
  if(!logs.length) return <div style={{textAlign:"center",padding:"24px",color:"#444",fontSize:"12px"}}>まだ記録がありません。タイマーで勉強を始めよう。</div>;
  const today=new Date().toISOString().slice(0,10);
  const todayLogs=logs.filter(l=>l.date===today);
  const todayTotal=todayLogs.reduce((s,l)=>s+l.minutes,0);
  const bySubject={};
  todayLogs.forEach(l=>{bySubject[l.subject]=(bySubject[l.subject]||0)+l.minutes;});
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:"16px"}}>
        <div style={{fontSize:"11px",color:"#666",letterSpacing:"1px",textTransform:"uppercase"}}>Today's Total</div>
        <div style={{fontSize:"40px",fontWeight:"800",color:"#f5f5f5",fontFamily:"'Courier New',monospace"}}>{Math.floor(todayTotal/60)}h {todayTotal%60}m</div>
      </div>
      {Object.entries(bySubject).length>0&&(
        <div style={{display:"flex",gap:"6px",justifyContent:"center",flexWrap:"wrap",marginBottom:"16px"}}>
          {Object.entries(bySubject).map(([subj,mins])=>(
            <div key={subj} style={{background:`${sColorMap[subj]||"#555"}18`,border:`1px solid ${sColorMap[subj]||"#555"}35`,borderRadius:"6px",padding:"8px 14px",textAlign:"center"}}>
              <div style={{fontSize:"10px",color:sColorMap[subj]||"#888",fontWeight:"700"}}>{subj}</div>
              <div style={{fontSize:"16px",fontWeight:"700",color:"#ccc"}}>{mins}m</div>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
        {todayLogs.slice().reverse().map((l,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",fontSize:"13px",borderRadius:"4px",background:"rgba(255,255,255,0.015)"}}>
            <span style={{color:sColorMap[l.subject]||"#888",fontWeight:"700",minWidth:"48px",fontSize:"12px"}}>{l.subject}</span>
            <span style={{color:"#888"}}>{l.minutes}min</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ━━━ Main ━━━ */
export default function TodoaiPlanFinal(){
  const[tabIndex,setTabIndex]=useState(0);
  const[expandedPhase,setExpandedPhase]=useState("p1");
  const[expandedBook,setExpandedBook]=useState(null);
  const[scheduleView,setScheduleView]=useState("satPeriod");
  const[logs,setLogs]=useState([]);
  const[importedData,setImportedData]=useState(null);

  useEffect(()=>{
    loadData("study-logs",[]).then(setLogs);
    loadData("ai-import",null).then(setImportedData);
  },[]);

  const handleLog=useCallback((entry)=>{
    setLogs(prev=>{const next=[...prev,entry];saveData("study-logs",next);return next;});
  },[]);

  const handleImport=useCallback((data)=>{
    setImportedData(data);
  },[]);

  // 6 tabs now
  const tabList=[
    {id:"plan",label:"計画",num:"01"},
    {id:"books",label:"参考書",num:"02"},
    {id:"schedule",label:"予定",num:"03"},
    {id:"timer",label:"タイマー",num:"04"},
    {id:"tips",label:"戦略",num:"05"},
    {id:"ai",label:"AI取込",num:"AI",special:true},
  ];

  const touchStart=useRef(null);
  const touchLocked=useRef(null);
  const[swO,setSwO]=useState(0);
  const[swiping,setSwiping]=useState(false);
  const onTS=(e)=>{touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};touchLocked.current=null;setSwiping(true);};
  const onTM=(e)=>{
    if(!touchStart.current)return;
    const dx=e.touches[0].clientX-touchStart.current.x;
    const dy=e.touches[0].clientY-touchStart.current.y;
    if(!touchLocked.current&&(Math.abs(dx)>10||Math.abs(dy)>10)){touchLocked.current=Math.abs(dx)>Math.abs(dy)?"x":"y";}
    if(touchLocked.current==="x"){setSwO(dx*0.4);}
  };
  const onTE=()=>{
    if(touchLocked.current==="x"&&Math.abs(swO)>30){
      if(swO<0&&tabIndex<tabList.length-1)setTabIndex(i=>i+1);
      else if(swO>0&&tabIndex>0)setTabIndex(i=>i-1);
    }
    setSwO(0);setSwiping(false);touchStart.current=null;touchLocked.current=null;
  };
  let dO=swO;
  if((tabIndex===0&&swO>0)||(tabIndex===tabList.length-1&&swO<0))dO=Math.sign(swO)*Math.pow(Math.abs(swO),0.5)*2;

  return(
    <div style={{fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif",background:"#111",backgroundImage:`${noiseSvg},${dotPat}`,backgroundRepeat:"repeat",height:"100dvh",display:"flex",flexDirection:"column",color:"#d4d4d4",overflow:"hidden",maxWidth:"430px",margin:"0 auto",position:"relative"}}>

      {/* Header — compact for mobile */}
      <header style={{padding:"14px 16px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-20px",right:"-12px",width:"70px",height:"70px",border:"1px solid rgba(255,255,255,0.04)",transform:"rotate(45deg)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}}>
          <h1 style={{fontSize:"18px",fontWeight:"900",color:"#f5f5f5",margin:0,letterSpacing:"-0.5px"}}>
            東大文系 <span style={{color:"#e85d3a"}}>合格戦略</span>
          </h1>
          <span style={{fontSize:"9px",color:"#e85d3a",border:"1px solid #e85d3a",borderRadius:"2px",padding:"2px 5px",fontWeight:"700",letterSpacing:"1px",flexShrink:0}}>REVISED</span>
          {importedData&&(
            <span style={{fontSize:"9px",color:"#2a9d8f",border:"1px solid #2a9d8f",borderRadius:"2px",padding:"2px 5px",fontWeight:"700",letterSpacing:"1px",flexShrink:0,marginLeft:"auto"}}>
              {importedData.year}取込済
            </span>
          )}
        </div>
        <p style={{margin:"0 0 8px",fontSize:"10px",color:"#555"}}>立川高校通学 — SAT/AP → 放課後 + 長期休み</p>
        <div style={{display:"flex",gap:"3px"}}>
          {phaseTimeline.map((p,i)=><div key={i} style={{flex:i===2||i===3?2:1,height:"2px",background:p.color,borderRadius:"2px",opacity:.7}}/>)}
        </div>
      </header>

      {/* Tabs — scrollable if needed */}
      <nav style={{display:"flex",padding:"0 4px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0,background:"#111",backgroundImage:noiseSvg,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {tabList.map((tab,i)=>(
          <button key={tab.id} onClick={()=>setTabIndex(i)} style={{
            flex:"0 0 auto",minWidth:`${100/tabList.length}%`,padding:"10px 4px 8px",background:"transparent",border:"none",
            borderBottom:tabIndex===i?`2px solid ${tab.special?"#2a9d8f":"#e85d3a"}`:"2px solid transparent",
            color:tabIndex===i?"#f5f5f5":"#555",cursor:"pointer",fontSize:"11px",
            fontWeight:tabIndex===i?"700":"500",transition:"color 200ms ease-out, border-color 200ms ease-out",
            position:"relative",
          }}>
            <span style={{fontSize:"8px",display:"block",color:tabIndex===i?(tab.special?"#2a9d8f":"#e85d3a"):"#444",marginBottom:"1px"}}>{tab.num}</span>
            {tab.label}
            {tab.special&&importedData&&<span style={{position:"absolute",top:"6px",right:"6px",width:"5px",height:"5px",borderRadius:"50%",background:"#2a9d8f"}}/>}
          </button>
        ))}
      </nav>

      {/* Swipeable content */}
      <div style={{flex:1,minHeight:0,overflow:"hidden"}} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
        <div style={{display:"flex",width:`${tabList.length*100}%`,height:"100%",transform:`translateX(calc(-${tabIndex*(100/tabList.length)}% + ${dO}px))`,transition:swiping?"none":"transform 320ms cubic-bezier(0.34,1.15,0.64,1)"}}>

          {/* Tab 1: Plan */}
          <div style={{width:`${100/tabList.length}%`,flexShrink:0,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <div style={{padding:"14px 14px 40px",display:"flex",flexDirection:"column",gap:"8px"}}>
              {phaseTimeline.map((ph,idx)=>{const isO=expandedPhase===ph.id;return(
                <FadeIn key={ph.id} delay={idx*20}><div style={{background:isO?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.01)",border:`1px solid ${isO?ph.color+"40":"rgba(255,255,255,0.05)"}`,borderRadius:"8px",overflow:"hidden",transition:"all 200ms ease-out"}}>
                  <button onClick={()=>setExpandedPhase(isO?null:ph.id)} style={{width:"100%",padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px",background:"transparent",border:"none",cursor:"pointer",color:"#ddd",textAlign:"left",minHeight:"52px"}}>
                    <div style={{width:"8px",height:"8px",borderRadius:"50%",background:ph.color,flexShrink:0,boxShadow:`0 0 8px ${ph.color}50`}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:"700",fontSize:"14px",color:"#eee"}}>{ph.label}</div>
                      <div style={{fontSize:"11px",color:"#555",marginTop:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ph.months} / {ph.hours}</div>
                    </div>
                    <span style={{color:"#555",fontSize:"14px",transform:isO?"rotate(180deg)":"none",transition:"transform 200ms ease-out",flexShrink:0}}>▾</span>
                  </button>
                  {isO&&<div style={{padding:"0 14px 14px"}}><p style={{margin:"0 0 10px",fontSize:"12px",color:"#888",fontStyle:"italic",lineHeight:"1.5"}}>{ph.subtitle}</p><ProgressBar items={ph.priorities}/><div style={{display:"flex",flexDirection:"column",gap:"6px",marginTop:"10px"}}>{ph.priorities.map((p,i)=><div key={i} style={{display:"flex",gap:"10px",fontSize:"12px"}}><span style={{color:sColorMap[p.s]||"#888",fontWeight:"700",minWidth:"52px",fontSize:"11px"}}>{p.s}</span><span style={{color:"#999",lineHeight:"1.5"}}>{p.t}</span></div>)}</div><div style={{marginTop:"10px",padding:"10px 12px",borderRadius:"6px",background:`${ph.color}10`,borderLeft:`3px solid ${ph.color}`,fontSize:"11px",color:"#aaa",lineHeight:"1.6"}}>{ph.tip}</div></div>}
                </div></FadeIn>
              );})}
              <FadeIn delay={120}><div style={{marginTop:"4px",background:"rgba(255,255,255,0.015)",border:"1px solid rgba(232,93,58,0.15)",borderRadius:"8px",padding:"14px"}}>
                <div style={{fontWeight:"700",fontSize:"11px",color:"#e85d3a",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"10px"}}>Key Milestones</div>
                <div style={{display:"flex",flexDirection:"column",gap:"8px",fontSize:"12px",color:"#999"}}>
                  {[["8月","東大模試（夏）— D判定でもOK"],["10〜11月","東大模試（秋）— C判定以上"],["1月","共通テスト — 85%以上"],["2月下旬","二次試験本番"]].map(([d,desc],i)=><div key={i} style={{display:"flex",gap:"12px"}}><span style={{color:"#e85d3a",fontWeight:"700",minWidth:"56px",fontSize:"11px"}}>{d}</span><span style={{lineHeight:"1.5"}}>{desc}</span></div>)}
                </div>
              </div></FadeIn>
            </div>
          </div>

          {/* Tab 2: Books */}
          <div style={{width:`${100/tabList.length}%`,flexShrink:0,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <div style={{padding:"14px 14px 40px",display:"flex",flexDirection:"column",gap:"8px"}}>
              {Object.entries(books).map(([key,s],idx)=>{const isO=expandedBook===key;return(
                <FadeIn key={key} delay={idx*20}><div style={{background:"rgba(255,255,255,0.01)",border:`1px solid ${isO?s.color+"50":"rgba(255,255,255,0.05)"}`,borderRadius:"8px",overflow:"hidden",transition:"border-color 200ms ease-out"}}>
                  <button onClick={()=>setExpandedBook(isO?null:key)} style={{width:"100%",padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px",background:"transparent",border:"none",cursor:"pointer",color:"#ddd",textAlign:"left",minHeight:"52px"}}>
                    <div style={{width:"32px",height:"32px",borderRadius:"4px",background:s.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"800",flexShrink:0}}>{s.icon}</div>
                    <span style={{fontWeight:"700",fontSize:"15px",flex:1}}>{s.name}</span>
                    {importedData?.subjectDifficulty?.[s.name]&&(
                      <DifficultyStars level={importedData.subjectDifficulty[s.name].level}/>
                    )}
                    <span style={{color:"#555",fontSize:"14px",transform:isO?"rotate(180deg)":"none",transition:"transform 200ms ease-out",marginLeft:"6px"}}>▾</span>
                  </button>
                  {isO&&<div style={{padding:"0 14px 14px"}}>
                    <div style={{background:`${s.color}12`,borderLeft:`3px solid ${s.color}`,borderRadius:"4px",padding:"10px 12px",marginBottom:"14px",fontSize:"11px",color:"#aaa",lineHeight:"1.6"}}>{s.strategy}</div>
                    {importedData?.subjectDifficulty?.[s.name]&&(
                      <div style={{padding:"8px 10px",borderRadius:"6px",background:"rgba(233,196,106,0.06)",border:"1px solid rgba(233,196,106,0.15)",marginBottom:"14px",fontSize:"11px",color:"#aaa",lineHeight:"1.6",display:"flex",gap:"8px",alignItems:"flex-start"}}>
                        <div style={{flexShrink:0}}><DifficultyStars level={importedData.subjectDifficulty[s.name].level}/><div style={{fontSize:"9px",color:"#e9c46a",marginTop:"2px"}}>{importedData.year}年傾向</div></div>
                        <span>{importedData.subjectDifficulty[s.name].comment}</span>
                      </div>
                    )}
                    {s.phases.map((ph,pi)=><div key={pi} style={{marginBottom:pi<s.phases.length-1?"14px":0}}>
                      <div style={{fontSize:"10px",fontWeight:"700",color:s.accent||s.color,letterSpacing:"1.5px",marginBottom:"6px",textTransform:"uppercase"}}>{ph.period}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>{ph.items.map((b,bi)=><div key={bi} style={{background:"rgba(255,255,255,0.02)",borderRadius:"6px",padding:"10px 12px",borderLeft:`2px solid ${s.color}40`}}><div style={{fontWeight:"600",fontSize:"13px",color:"#ddd"}}>{b.n}</div><div style={{fontSize:"11px",color:"#888",marginTop:"4px",lineHeight:"1.5"}}>{b.d}</div></div>)}</div>
                    </div>)}
                  </div>}
                </div></FadeIn>
              );})}
            </div>
          </div>

          {/* Tab 3: Schedule */}
          <div style={{width:`${100/tabList.length}%`,flexShrink:0,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <div style={{padding:"14px 14px 40px"}}>
              <div style={{display:"flex",gap:"4px",marginBottom:"14px"}}>
                {Object.entries(weeklySchedules).map(([key])=><button key={key} onClick={()=>setScheduleView(key)} style={{flex:1,padding:"10px 4px",borderRadius:"6px",background:scheduleView===key?"rgba(255,255,255,0.06)":"transparent",border:`1px solid ${scheduleView===key?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)"}`,color:scheduleView===key?"#eee":"#555",cursor:"pointer",fontSize:"10px",fontWeight:"600",textAlign:"center",transition:"all 200ms ease-out",minHeight:"44px"}}>{key==="satPeriod"?"SAT/AP":key==="schoolTerm"?"学期中":"長期休"}</button>)}
              </div>
              {(()=>{const sc=weeklySchedules[scheduleView];return(<div>
                <div style={{fontSize:"13px",color:"#aaa",fontWeight:"600"}}>{sc.label}</div>
                <div style={{fontSize:"11px",color:"#666",marginBottom:"12px"}}>{sc.sub}</div>
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {sc.days.map((day,di)=><FadeIn key={di} delay={di*25}><div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"8px",overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",fontWeight:"700",fontSize:"13px",color:"#ccc"}}>{day.day}</div>
                    <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:"6px"}}>
                      {day.slots.map((sl,si)=><div key={si} style={{display:"flex",alignItems:"flex-start",gap:"10px",fontSize:"12px",padding:"2px 4px"}}>
                        <span style={{color:"#555",fontFamily:"'Courier New',monospace",fontSize:"10px",minWidth:"72px",paddingTop:"1px"}}>{sl.t}</span>
                        <span style={{color:sColorMap[sl.s]||"#888",fontWeight:"700",minWidth:"46px",fontSize:"11px"}}>{sl.s}</span>
                        <span style={{color:"#888",lineHeight:"1.4",flex:1}}>{sl.d}</span>
                      </div>)}
                    </div>
                  </div></FadeIn>)}
                </div>
              </div>);})()}
            </div>
          </div>

          {/* Tab 4: Timer */}
          <div style={{width:`${100/tabList.length}%`,flexShrink:0,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <div style={{padding:"14px 14px 40px"}}>
              <StudyTimer onLog={handleLog}/>
              <div style={{marginTop:"20px"}}><StudyLog logs={logs}/></div>
            </div>
          </div>

          {/* Tab 5: Tips */}
          <div style={{width:`${100/tabList.length}%`,flexShrink:0,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <div style={{padding:"14px 14px 40px",display:"flex",flexDirection:"column",gap:"8px"}}>
              {tips.map((tip,i)=><FadeIn key={i} delay={i*20}><div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"8px",padding:"16px"}}>
                <div style={{fontSize:"14px",fontWeight:"700",color:"#ddd",marginBottom:"6px"}}>{tip.title}</div>
                <p style={{margin:0,fontSize:"12px",color:"#888",lineHeight:"1.7"}}>{tip.c}</p>
              </div></FadeIn>)}
            </div>
          </div>

          {/* Tab 6: AI Import */}
          <div style={{width:`${100/tabList.length}%`,flexShrink:0,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <AIImportTab importedData={importedData} onImport={handleImport}/>
          </div>

        </div>
      </div>
    </div>
  );
}
