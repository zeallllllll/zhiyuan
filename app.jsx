/* main app */
const { useState, useMemo } = React;

const DEFAULT_SCORE = "710";
const DEFAULT_GAOKAO_SCORE = "520";

function formatScore(v) {
  if (v == null || Number.isNaN(Number(v))) return "-";
  return Number(v).toFixed(1).replace(/\.0$/, "");
}

function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

const MATCH_RULES = {
  中考: {
    保守: { minDiff: -8, maxDiff: 35, steady: 6, safe: 18, ideals: { 冲刺: -3, 稳妥: 10, 保底: 24 }, penalty: 2.1 },
    均衡: { minDiff: -15, maxDiff: 32, steady: 0, safe: 14, ideals: { 冲刺: -7, 稳妥: 6, 保底: 21 }, penalty: 1.9 },
    激进: { minDiff: -24, maxDiff: 28, steady: -5, safe: 10, ideals: { 冲刺: -12, 稳妥: 2, 保底: 17 }, penalty: 1.75 },
  },
  高考: {
    保守: { minDiff: -10, maxDiff: 55, steady: 8, safe: 24, ideals: { 冲刺: -4, 稳妥: 14, 保底: 34 }, penalty: 1.35 },
    均衡: { minDiff: -24, maxDiff: 48, steady: 0, safe: 18, ideals: { 冲刺: -10, 稳妥: 8, 保底: 28 }, penalty: 1.25 },
    激进: { minDiff: -38, maxDiff: 40, steady: -8, safe: 12, ideals: { 冲刺: -18, 稳妥: 2, 保底: 22 }, penalty: 1.15 },
  },
};

function bucketForDiff(diff, rule) {
  if (diff >= rule.safe) return "保底";
  if (diff >= rule.steady) return "稳妥";
  return "冲刺";
}

function historyCoverage(item) {
  const history = item.scoreHistory || {};
  const values = Object.keys(history).filter((year) => year !== "2025" && history[year] != null);
  return values.length;
}

function stableJitter(key) {
  const text = String(key || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 997;
  }
  return (hash % 9) - 4;
}

function smartScore({ diff, bucket, rule, trend, delta, coverage, hiddenTopScore = false, key }) {
  const ideal = rule.ideals[bucket];
  const distancePenalty = Math.abs(diff - ideal) * rule.penalty;
  const trendPenalty = trend === "up" && diff < rule.steady ? Math.min(8, Math.max(0, delta || 0) * 1.2) : 0;
  const missingPenalty = Math.max(0, 2 - coverage) * 3;
  const hiddenPenalty = hiddenTopScore ? 4 : 0;
  const base = bucket === "冲刺" ? 82 : bucket === "稳妥" ? 88 : 80;
  return clamp(40, 96, Math.round(base - distancePenalty - trendPenalty - missingPenalty - hiddenPenalty + stableJitter(key)));
}

function matchSchool(s, score, risk) {
  const diff = score - s.score2025;
  const rule = MATCH_RULES.中考[risk] || MATCH_RULES.中考.均衡;
  const recommendable = diff >= rule.minDiff && diff <= rule.maxDiff;
  const bucket = bucketForDiff(diff, rule);
  const coverage = historyCoverage(s);
  const rec = smartScore({ diff, bucket, rule, trend: s.trend, delta: s.delta, coverage, key: s.name });
  return {
    ...s,
    diff: Number(diff.toFixed(1)),
    bucket,
    recommendable,
    rec,
    stars: clamp(1, 5, Math.ceil(rec / 20)),
  };
}

function matchProgram(p, score, risk) {
  const targetScore = p.score2025 ?? 580;
  const diff = score - targetScore;
  const rule = MATCH_RULES.高考[risk] || MATCH_RULES.高考.均衡;
  const recommendable = diff >= rule.minDiff && diff <= rule.maxDiff;
  const bucket = bucketForDiff(diff, rule);
  const coverage = historyCoverage(p);
  const rec = smartScore({ diff, bucket, rule, trend: p.trend, delta: p.delta, coverage, hiddenTopScore: p.score2025 == null, key: p.code });
  return {
    ...p,
    diff: Number(diff.toFixed(1)),
    bucket,
    recommendable,
    rec,
    stars: clamp(1, 5, Math.ceil(rec / 20)),
  };
}

function deltaText(s) {
  if (s.score2025 == null) return "580+";
  if (s.delta == null) return "新增";
  if (s.delta === 0) return "持平";
  return `${s.delta > 0 ? "↑" : "↓"} ${formatScore(Math.abs(s.delta))}`;
}

function trendLabel(trend) {
  return { up: "上升", down: "下降", flat: "持平", new: "新增" }[trend] || "-";
}

function historyText(history, years, labels) {
  return years
    .map((year) => `${labels?.[year] || String(year).slice(2)} ${history?.[year] ?? "-"}`)
    .join(" / ");
}

function Hero({ mode, itemCount }) {
  const isGaokao = mode === "高考";
  return (
    <header className="hero">
      <div className="hero-grid">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <span className="glyph"><IconSparkles size={16} color="#fff"/></span>
            2026年上海{isGaokao ? "高考" : "中考"}志愿填报
          </div>
          <h1 className="hero-title">{isGaokao ? "上海高考本科普通批投档线总览与智能匹配工具" : "浦东新区高中招生数据总览与智能匹配工具"}</h1>
          <p className="hero-sub">基于上海市教育考试院公开录取线，结合个人成绩与偏好，生成冲稳保参考方案</p>
          <div className="hero-actions">
            <button className="btn btn-primary">
              <IconSparkles size={16}/>
              开始智能测算
            </button>
            <button className="btn btn-ghost-dark">
              <IconDatabase size={16}/>
              查看官方数据
            </button>
          </div>
        </div>
        <div className="hero-tiles">
          <HeroTile className="tile-purple" icon={<IconSchool size={14} color="#fff"/>}
                    label={isGaokao ? "院校专业组" : "已接入学校"} value={itemCount} unit={isGaokao ? "组" : "所"} foot="官方表逐条录入" />
          <HeroTile className="tile-amber"  icon={<IconMap size={14} color="#fff"/>}
                    label={isGaokao ? "招生批次" : "考生区域"} valueText={isGaokao ? "本科普通批" : "浦东新区"} foot={isGaokao ? "平行志愿" : "名额分配到区"} />
          <HeroTile className="tile-blue"   icon={<IconCalendar size={14} color="#fff"/>}
                    label="数据年份" valueText={isGaokao ? "2021-2025" : "2022-2025"} foot={isGaokao ? "本科普通批投档线" : "录取最低分数线"} />
          <HeroTile className="tile-green"  icon={<IconLayers size={14} color="#fff"/>}
                    label="数据来源" valueText="上海市教育考试院" foot="官方公开 PDF" />
        </div>
      </div>
    </header>
  );
}

function HeroTile({ className, icon, label, value, unit, valueText, foot }) {
  return (
    <div className={`hero-tile ${className}`}>
      <div className="hero-tile-head">
        <span className="hero-tile-icon">{icon}</span>
        {label}
      </div>
      <div className="hero-tile-value">
        {value != null
          ? (<>{value}<span className="unit">{unit}</span></>)
          : (<span className="ck-text">{valueText}</span>)}
      </div>
      <div className="hero-tile-foot">{foot}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function FilterBar({ state, setState, onReset }) {
  const set = (k) => (e) => setState(s => ({ ...s, [k]: e.target.value }));
  const isGaokao = state.mode === "高考";
  return (
    <section className="filter-bar">
      <div className="filter-grid">
        <Field label="模式选择">
          <div className="seg">
            <button className={state.mode === "中考" ? "active" : ""}
                    onClick={() => setState(s => ({ ...s, mode: "中考", area: "浦东新区", score: DEFAULT_SCORE, sameScore: "不限", nature: "不限" }))}>中考</button>
            <button className={state.mode === "高考" ? "active" : ""}
                    onClick={() => setState(s => ({ ...s, mode: "高考", area: "本科普通批", score: DEFAULT_GAOKAO_SCORE, sameScore: "不限", nature: "不限" }))}>高考</button>
          </div>
        </Field>
        <Field label={isGaokao ? "招生批次" : "所在区域"}>
          <select className="select" value={state.area} onChange={set("area")}>
            <option>{isGaokao ? "本科普通批" : "浦东新区"}</option>
          </select>
        </Field>
        <Field label="预估分数">
          <div className="input-suffix">
            <input className="input" value={state.score}
                   onChange={set("score")} inputMode="decimal"/>
            <span className="suffix">分</span>
          </div>
        </Field>
        <Field label="风险偏好">
          <select className="select" value={state.risk} onChange={set("risk")}>
            <option>均衡</option>
            <option>保守</option>
            <option>激进</option>
          </select>
        </Field>
        <Field label={isGaokao ? "分数段" : "同分优待"}>
          <select className="select" value={state.sameScore} onChange={set("sameScore")}>
            <option>不限</option>
            {isGaokao ? (
              <>
                <option>580分及以上</option>
                <option>580分以下</option>
              </>
            ) : (
              <>
                <option>是</option>
                <option>否</option>
              </>
            )}
          </select>
        </Field>
        <Field label={isGaokao ? "年份对照" : "学校性质"}>
          <select className="select" value={state.nature} onChange={set("nature")}>
            <option>不限</option>
            {isGaokao ? (
              <>
                <option>有2024对照</option>
                <option>2025新增或无同码</option>
              </>
            ) : (
              <option>公办</option>
            )}
          </select>
        </Field>
        <Field label="分数变化">
          <select className="select" value={state.trendFilter} onChange={set("trendFilter")}>
            <option>不限</option>
            <option value="up">上升</option>
            <option value="down">下降</option>
            <option value="flat">持平</option>
            <option value="new">新增</option>
          </select>
        </Field>
        <Field label={isGaokao ? "搜索院校/代码" : "搜索学校名称"}>
          <div className="input-search">
            <input className="input" placeholder={isGaokao ? "输入院校或专业组代码" : "输入学校名称"}
                   value={state.search} onChange={set("search")}/>
            <span className="icon"><IconSearch size={14}/></span>
          </div>
        </Field>
        <Field label="&nbsp;">
          <button className="btn-reset" onClick={onReset}>重置</button>
        </Field>
      </div>
    </section>
  );
}

function Metrics({ items, mode }) {
  const isGaokao = mode === "高考";
  const scores = items.map(s => s.score2025).filter(v => v != null);
  const avg = scores.length ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
  const highest580 = isGaokao && items.some(s => s.score2025 == null);
  const highest = scores.length ? items.filter(s => s.score2025 != null).reduce((max, s) => s.score2025 > max.score2025 ? s : max, items.find(s => s.score2025 != null)) : null;
  const lowest = scores.length ? items.filter(s => s.score2025 != null).reduce((min, s) => s.score2025 < min.score2025 ? s : min, items.find(s => s.score2025 != null)) : null;
  const avgDelta = items.filter(s => s.delta != null).reduce((sum, s, _, arr) => sum + s.delta / arr.length, 0);
  return (
    <section className="metrics">
      <div className="metric m-avg">
        <div>
          <div className="metric-label">{isGaokao ? "平均投档线" : "平均录取线"}</div>
          <div className="metric-value">{formatScore(avg)}<span className="unit">分</span></div>
          <div className="metric-foot">较去年 <span className={avgDelta >= 0 ? "up" : ""}>{avgDelta >= 0 ? "↑" : "↓"} {formatScore(Math.abs(avgDelta))}</span></div>
        </div>
        <div className="metric-art"><Sparkline/></div>
      </div>
      <div className="metric m-high">
        <div>
          <div className="metric-label">{isGaokao ? "最高投档线" : "最高录取线"}</div>
          <div className="metric-value">{highest580 ? "580+" : formatScore(highest?.score2025)}<span className="unit">分</span></div>
          <div className="metric-foot" style={{color:"#b76b00"}}>{highest580 ? "官方未公开具体分" : highest?.name || "-"}</div>
        </div>
        <div className="metric-art"><ArtCrown/></div>
      </div>
      <div className="metric m-low">
        <div>
          <div className="metric-label">{isGaokao ? "最低投档线" : "最低录取线"}</div>
          <div className="metric-value">{formatScore(lowest?.score2025)}<span className="unit">分</span></div>
          <div className="metric-foot" style={{color:"#2a59c4"}}>{lowest?.name || "-"}</div>
        </div>
        <div className="metric-art"><ArtShield/></div>
      </div>
      <div className="metric m-count">
        <div>
          <div className="metric-label" style={{display:"flex",alignItems:"center",gap:6}}>
            <IconTarget size={14} color="#1da671"/> 当前匹配{isGaokao ? "专业组数" : "学校数"}
          </div>
          <div className="metric-value">{items.length}<span className="unit">{isGaokao ? "组" : "所"}</span></div>
          <div className="metric-foot" style={{color:"#1da671"}}>符合筛选条件</div>
        </div>
        <div className="metric-art"><ArtTarget/></div>
      </div>
    </section>
  );
}

function SchoolRow({ s }) {
  const bucketCls = s.bucket === "冲刺" ? "pill-chong" : s.bucket === "稳妥" ? "pill-wen" : "pill-bao";
  const recCls = s.bucket === "冲刺" ? "rec-num-orange" : "rec-num-green";
  return (
    <div className="row">
      <div className="rank">
        {s.rank <= 3 ? <div className="rank-medal"><Medal rank={s.rank}/></div> : s.rank}
      </div>
      <div className="logo" style={{background: s.logoBg, color: "#fff"}}>
        {s.logoText}
      </div>
      <div className="school-meta">
        <div className="school-name-row">
          <span className="school-name">{s.name}</span>
          {s.tags.map((t, i) => (
            <span key={i} className={`tag tag-${t.kind}`}>{t.label}</span>
          ))}
        </div>
        <div className="school-loc">
          <IconPin size={11}/> {s.area}
          <span className="sep">|</span> {s.nature}
          <span className="sep">|</span> 同分优待：{s.sameScore2025}
        </div>
        <div className="school-blurb">
          <IconBook size={11}/> {s.blurb}
        </div>
      </div>

      <div className="col">
        <span className="col-h">历年线</span>
        <span className="col-v plain history-line">{historyText(s.scoreHistory, [2022, 2023, 2024])}</span>
      </div>
      <div className="col">
        <span className="col-h">2025录取线</span>
        <span className="col-v">{formatScore(s.score2025)}</span>
        <span className={`delta ${s.trend === "down" ? "down" : ""}`}>{deltaText(s)}</span>
      </div>
      <div className="col">
        <span className="col-h">趋势</span>
        <span className={`trend ${s.trend}`}>
          {trendLabel(s.trend)}
          {s.trend !== "new" && <IconTrendUp size={14}/>}
        </span>
      </div>
      <div className="col">
        <span className="col-h">语数外</span>
        <span className="col-v">{formatScore(s.ysw2025)}</span>
      </div>
      <div className="col">
        <span className="col-h">数学 / 语文</span>
        <span className="col-v plain">{formatScore(s.math2025)} / {formatScore(s.chinese2025)}</span>
      </div>
      <div className="col">
        <span className="col-h">综合测试</span>
        <span className="col-v">{formatScore(s.test2025)}</span>
      </div>

      <div className="rec">
        <span className="col-h">匹配指数</span>
        <span className="rec-score">
          <span className={recCls}>{s.rec}</span>
          <Stars n={s.stars}/>
        </span>
      </div>
      <div className="cell-actions">
        <span className={`pill ${bucketCls}`}>{s.bucket}</span>
        <button className="btn-detail">分差 {s.diff >= 0 ? "+" : ""}{formatScore(s.diff)}</button>
      </div>
    </div>
  );
}

function SchoolTable({ items, sort, setSort }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          名额分配到区录取线 <span className="count">（共 {items.length} 所符合条件）</span>
        </div>
        <div className="sort">
          排序：
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="rec">匹配指数</option>
            <option value="score">2025录取线</option>
            <option value="ysw">语数外</option>
            <option value="delta">涨幅</option>
          </select>
        </div>
      </div>
      <div className="school-list">
        <GroupedRows
          items={items}
          unit="所"
          renderItem={(s) => <SchoolRow key={s.id} s={s}/>}
        />
      </div>
      <div className="more">数据来源：上海市教育考试院 2022-2025 年浦东新区名额分配到区录取最低分数线 <IconChevronDown size={14}/></div>
    </section>
  );
}

function ProgramRow({ p }) {
  const bucketCls = p.bucket === "冲刺" ? "pill-chong" : p.bucket === "稳妥" ? "pill-wen" : "pill-bao";
  const recCls = p.bucket === "冲刺" ? "rec-num-orange" : "rec-num-green";
  return (
    <div className="row">
      <div className="rank">{p.rank <= 3 ? <div className="rank-medal"><Medal rank={p.rank}/></div> : p.rank}</div>
      <div className="logo" style={{background: "#324a7a", color: "#fff"}}>{p.name.slice(0, 1)}</div>
      <div className="school-meta">
        <div className="school-name-row">
          <span className="school-name">{p.name}</span>
          <span className="tag tag-blue">{p.code}</span>
          {p.score2025 == null && <span className="tag tag-orange">580分及以上</span>}
        </div>
        <div className="school-loc">
          <IconPin size={11}/> 上海高考
          <span className="sep">|</span> 本科普通批
          <span className="sep">|</span> 平行志愿院校专业组
        </div>
        <div className="school-blurb">
          <IconBook size={11}/> 2025投档线 {p.score2025Label}，末位语数合计 {formatScore(p.cnMath2025)}。
        </div>
      </div>

      <div className="col">
        <span className="col-h">历年线</span>
        <span className="col-v plain history-line">{historyText(p.scoreLabelHistory, [2021, 2022, 2023, 2024])}</span>
      </div>
      <div className="col">
        <span className="col-h">2025投档线</span>
        <span className="col-v">{p.score2025Label}</span>
        <span className={`delta ${p.trend === "down" ? "down" : ""}`}>{deltaText(p)}</span>
      </div>
      <div className="col">
        <span className="col-h">语数合计</span>
        <span className="col-v">{formatScore(p.cnMath2025)}</span>
      </div>
      <div className="col">
        <span className="col-h">语/数最高</span>
        <span className="col-v">{formatScore(p.highCnMath2025)}</span>
      </div>
      <div className="col">
        <span className="col-h">外语</span>
        <span className="col-v">{formatScore(p.foreign2025)}</span>
      </div>
      <div className="col">
        <span className="col-h">选考高/中/低</span>
        <span className="col-v plain">{formatScore(p.electiveHigh2025)} / {formatScore(p.electiveMid2025)} / {formatScore(p.electiveLow2025)}</span>
      </div>

      <div className="rec">
        <span className="col-h">匹配指数</span>
        <span className="rec-score">
          <span className={recCls}>{p.rec}</span>
          <Stars n={p.stars}/>
        </span>
      </div>
      <div className="cell-actions">
        <span className={`pill ${bucketCls}`}>{p.bucket}</span>
        <button className="btn-detail">分差 {p.diff >= 0 ? "+" : ""}{formatScore(p.diff)}</button>
      </div>
    </div>
  );
}

function ProgramTable({ items, sort, setSort }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          本科普通批院校专业组投档线 <span className="count">（共 {items.length} 组符合条件）</span>
        </div>
        <div className="sort">
          排序：
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="rec">匹配指数</option>
            <option value="score">2025投档线</option>
            <option value="ysw">语数合计</option>
            <option value="delta">涨幅</option>
          </select>
        </div>
      </div>
      <div className="school-list">
        <GroupedRows
          items={items}
          unit="组"
          renderItem={(p) => <ProgramRow key={p.id} p={p}/>}
        />
      </div>
      <div className="more">数据来源：上海市教育考试院 2021-2025 年本科普通批次平行志愿院校专业组投档分数线 <IconChevronDown size={14}/></div>
    </section>
  );
}

function namesFor(items, bucket) {
  const xs = items.filter(s => s.bucket === bucket).slice(0, 3).map(s => s.name);
  return xs.length ? xs.join("、") : "暂无匹配学校";
}

function BucketSection({ bucket, items, unit, children }) {
  if (!items.length) return null;
  const desc = {
    冲刺: "分数略高，可以作为理想目标",
    稳妥: "分差接近，优先重点考虑",
    保底: "低于当前分数，但未低到失去参考意义",
  }[bucket];
  return (
    <div className={`bucket-section bucket-${bucket}`}>
      <div className="bucket-head">
        <span className={`pill ${bucket === "冲刺" ? "pill-chong" : bucket === "稳妥" ? "pill-wen" : "pill-bao"}`}>{bucket}</span>
        <span className="bucket-count">{items.length} {unit}</span>
        <span className="bucket-desc">{desc}</span>
      </div>
      {children}
    </div>
  );
}

function GroupedRows({ items, unit, renderItem }) {
  return (
    <>
      {["冲刺", "稳妥", "保底"].map((bucket) => {
        const bucketItems = items.filter(item => item.bucket === bucket);
        return (
          <BucketSection key={bucket} bucket={bucket} items={bucketItems} unit={unit}>
            {bucketItems.map(renderItem)}
          </BucketSection>
        );
      })}
    </>
  );
}

function AISidebar({ items, score, mode }) {
  const isGaokao = mode === "高考";
  const chong = items.filter(s => s.bucket === "冲刺").length;
  const wen = items.filter(s => s.bucket === "稳妥").length;
  const bao = items.filter(s => s.bucket === "保底").length;
  const unit = isGaokao ? "组" : "所";
  const sourceUrl = isGaokao ? GAOKAO_DATA_SOURCES[0].url : DATA_SOURCES[0].url;
  return (
    <aside className="sidebar">
      <div className="ai-panel">
        <div className="ai-head">
          <div className="ai-avatar"><IconSparkles size={16} color="#6c5ce7"/></div>
          <div>
            <div className="ai-title">AI 志愿分析</div>
          </div>
          <span className="ai-time">数据年份：{isGaokao ? "2021-2025" : "2022-2025"}</span>
        </div>
        <div className="ai-sub">基于当前筛选条件和官方{isGaokao ? "投档线" : "录取线"}的参考分析</div>

        <div className="cohort">
          <div className="cohort-card c-chong">
            <div className="cohort-label">冲刺{isGaokao ? "专业组" : "学校"}</div>
            <div className="cohort-value">{chong}<span className="unit">{unit}</span></div>
          </div>
          <div className="cohort-card c-wen">
            <div className="cohort-label">稳妥{isGaokao ? "专业组" : "学校"}</div>
            <div className="cohort-value">{wen}<span className="unit">{unit}</span></div>
          </div>
          <div className="cohort-card c-bao">
            <div className="cohort-label">保底{isGaokao ? "专业组" : "学校"}</div>
            <div className="cohort-value">{bao}<span className="unit">{unit}</span></div>
          </div>
        </div>

        <div className="section-label"><span className="bar"></span>分析结论</div>
        <div className="analysis">
          当前预估分数 <span className="hl">{formatScore(score)} 分</span>。本页按2025年{isGaokao ? "投档线" : "录取线"}估算冲稳保分层：
          <span className="hl"> 冲 {chong} {unit} · 稳 {wen} {unit} · 保 {bao} {unit}</span>。分层仅用于排序和筛选参考，正式填报仍需结合招生计划、批次规则和学校简章。
        </div>

        <div className="section-label" style={{marginTop:18}}><span className="bar"></span>志愿填报建议</div>
        <div className="advice-list">
          <div className="advice-item">
            <div className="advice-num">1</div>
            <div><strong>冲刺参考：</strong>{namesFor(items, "冲刺")}</div>
          </div>
          <div className="advice-item">
            <div className="advice-num">2</div>
            <div><strong>稳妥参考：</strong>{namesFor(items, "稳妥")}</div>
          </div>
          <div className="advice-item">
            <div className="advice-num">3</div>
            <div><strong>保底参考：</strong>{namesFor(items, "保底")}</div>
          </div>
          <div className="advice-item">
            <div className="advice-num">4</div>
            <div><strong>数据说明：</strong>{isGaokao ? "高考数据单位为院校专业组，非整所高校；部分院校专业组2024年无同代码记录。" : "复旦大学附属复兴中学 2024 年按“上海市复兴高级中学”对应。"}</div>
          </div>
        </div>
        <a className="link-detail" href={sourceUrl} target="_blank" rel="noreferrer">
          查看官方数据来源 <IconChevronRight size={12}/>
        </a>

        <div className="risk">
          <div className="risk-head"><IconAlert size={14} color="#c63217"/> 风险提示</div>
          <div className="risk-body">{isGaokao ? "580分及以上专业组官方不公开具体投档分，本页按580+分段保留展示。" : "录取线会受当年计划数、考生结构、志愿热度影响。"}这里的匹配指数是基于历史分数线的估算，不等同于录取概率承诺。</div>
        </div>
      </div>
    </aside>
  );
}

function App() {
  const [state, setState] = useState({
    mode: "中考",
    area: "浦东新区",
    score: DEFAULT_SCORE,
    risk: "均衡",
    sameScore: "不限",
    nature: "不限",
    trendFilter: "不限",
    search: "",
  });
  const [sort, setSort] = useState("rec");

  const isGaokao = state.mode === "高考";
  const score = Number.parseFloat(state.score) || Number.parseFloat(isGaokao ? DEFAULT_GAOKAO_SCORE : DEFAULT_SCORE);

  const items = useMemo(() => {
    let xs = isGaokao
      ? GAOKAO_PROGRAMS.map(p => matchProgram(p, score, state.risk)).filter(p => {
          if (!p.recommendable) return false;
          if (state.search && !p.name.includes(state.search) && !p.code.includes(state.search)) return false;
          if (state.sameScore === "580分及以上" && p.score2025 != null) return false;
          if (state.sameScore === "580分以下" && p.score2025 == null) return false;
          if (state.nature === "有2024对照" && p.score2024Label == null) return false;
          if (state.nature === "2025新增或无同码" && p.score2024Label != null) return false;
          if (state.trendFilter !== "不限" && p.trend !== state.trendFilter) return false;
          return true;
        })
      : SCHOOLS.map(s => matchSchool(s, score, state.risk)).filter(s => {
          if (!s.recommendable) return false;
          if (state.search && !s.name.includes(state.search)) return false;
          if (state.nature !== "不限" && s.nature !== state.nature) return false;
          if (state.sameScore !== "不限" && s.sameScore2025 !== state.sameScore) return false;
          if (state.trendFilter !== "不限" && s.trend !== state.trendFilter) return false;
          return true;
        });
    const scoreValue = (x) => x.score2025 ?? 580;
    const yswValue = (x) => isGaokao ? (x.cnMath2025 ?? -1) : (x.ysw2025 ?? -1);
    if (sort === "rec") xs = xs.slice().sort((a,b) => b.rec - a.rec || scoreValue(b) - scoreValue(a));
    if (sort === "score") xs = xs.slice().sort((a,b) => scoreValue(b) - scoreValue(a));
    if (sort === "ysw") xs = xs.slice().sort((a,b) => yswValue(b) - yswValue(a));
    if (sort === "delta") xs = xs.slice().sort((a,b) => (b.delta ?? -999) - (a.delta ?? -999));
    return xs;
  }, [state, sort, score, isGaokao]);

  const onReset = () => setState({
    mode: state.mode, area: isGaokao ? "本科普通批" : "浦东新区", score: isGaokao ? DEFAULT_GAOKAO_SCORE : DEFAULT_SCORE, risk: "均衡",
    sameScore: "不限", nature: "不限", trendFilter: "不限", search: "",
  });

  return (
    <div className="page">
      <Hero mode={state.mode} itemCount={isGaokao ? GAOKAO_PROGRAMS.length : SCHOOLS.length}/>
      <div className="shell">
        <FilterBar state={state} setState={setState} onReset={onReset}/>
        <Metrics items={items} mode={state.mode}/>
        <div className="main">
          {isGaokao
            ? <ProgramTable items={items} sort={sort} setSort={setSort}/>
            : <SchoolTable items={items} sort={sort} setSort={setSort}/>}
          <AISidebar items={items} score={score} mode={state.mode}/>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
