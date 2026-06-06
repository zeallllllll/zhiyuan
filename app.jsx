/* main app */
const { useState, useMemo, useEffect } = React;

const DEFAULT_SCORE = "710";
const DEFAULT_GAOKAO_SCORE = "520";
const DEFAULT_DISTRICT = "pudong";
const GAOKAO_AREA = "本科普通批";
const AUTH_USERS_KEY = "zhiyuan.phone.users";
const AUTH_SESSION_KEY = "zhiyuan.phone.session";

function readStoredJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(normalizePhone(phone));
}

function maskPhone(phone) {
  const value = normalizePhone(phone);
  if (value.length !== 11) return value || "未登录";
  return `${value.slice(0, 3)}****${value.slice(7)}`;
}

function getStoredUsers() {
  return readStoredJson(AUTH_USERS_KEY, {});
}

function getInitialAuthUser() {
  const session = readStoredJson(AUTH_SESSION_KEY, null);
  if (!session || !session.phone) return null;
  const users = getStoredUsers();
  const user = users[session.phone];
  return user ? { phone: user.phone, name: user.name, createdAt: user.createdAt } : null;
}

function saveAuthSession(user) {
  writeStoredJson(AUTH_SESSION_KEY, { phone: user.phone, signedInAt: Date.now() });
}

function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

function registerLocalUser({ phone, password, name }) {
  const cleanPhone = normalizePhone(phone);
  if (!isValidPhone(cleanPhone)) throw new Error("请输入有效的 11 位手机号");
  if (String(password || "").length < 6) throw new Error("密码至少需要 6 位");

  const users = getStoredUsers();
  if (users[cleanPhone]) throw new Error("该手机号已注册，请直接登录");

  const user = {
    phone: cleanPhone,
    name: String(name || "").trim() || `用户${cleanPhone.slice(-4)}`,
    password: String(password),
    createdAt: new Date().toISOString(),
  };

  users[cleanPhone] = user;
  writeStoredJson(AUTH_USERS_KEY, users);
  saveAuthSession(user);
  return { phone: user.phone, name: user.name, createdAt: user.createdAt };
}

function loginLocalUser({ phone, password }) {
  const cleanPhone = normalizePhone(phone);
  if (!isValidPhone(cleanPhone)) throw new Error("请输入有效的 11 位手机号");

  const users = getStoredUsers();
  const user = users[cleanPhone];
  if (!user) throw new Error("该手机号尚未注册");
  if (user.password !== String(password || "")) throw new Error("手机号或密码不正确");

  saveAuthSession(user);
  return { phone: user.phone, name: user.name, createdAt: user.createdAt };
}

function formatScore(v) {
  if (v == null || Number.isNaN(Number(v))) return "-";
  return Number(v).toFixed(1).replace(/\.0$/, "");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getAdmissionLine(school) {
  const value =
    school.admissionScore2025 ??
    school.admissionScore ??
    school.score2025 ??
    school.line2025 ??
    school.minScore ??
    school.score;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function getVolunteerCategory(scoreDiff) {
  if (scoreDiff < 0) return "冲刺";
  if (scoreDiff >= 0 && scoreDiff <= 12) return "稳妥";
  return "保底";
}

function calculateSafeFitScore(scoreDiff) {
  const idealDiff = 6;
  const distance = Math.abs(scoreDiff - idealDiff);
  return 99 - distance * 1.8;
}

function calculateBackupScore(scoreDiff) {
  if (scoreDiff <= 20) {
    return 88 - (scoreDiff - 13) * 0.8;
  }

  return 82 - Math.min((scoreDiff - 20) * 0.7, 10);
}

function calculateReachScore(scoreDiff) {
  const gap = Math.abs(scoreDiff);

  if (gap <= 3) {
    return 82 - gap * 2;
  }

  if (gap <= 10) {
    return 76 - (gap - 3) * 3;
  }

  return 55 - Math.min((gap - 10) * 1.2, 10);
}

function getTrendAdjustment(school, category) {
  const trend = String(school.trend || school.trendType || "");

  if (trend.includes("下降") || trend === "down") {
    return 1;
  }

  if (trend.includes("持平") || trend === "flat") {
    return 0;
  }

  if (trend.includes("上升") || trend === "up") {
    if (category === "冲刺") return -3;
    if (category === "稳妥") return -1;
    if (category === "保底") return -1;
  }

  return 0;
}

function getRiskPreferenceAdjustment(riskPreference, category) {
  if (riskPreference === "保守") {
    if (category === "保底") return 2;
    if (category === "冲刺") return -4;
    return 0;
  }

  if (riskPreference === "激进") {
    if (category === "冲刺") return 3;
    if (category === "保底") return -2;
    return 0;
  }

  return 0;
}

function getDataQualityAdjustment(school) {
  const history = school.historyScores || school.history || school.lines || [];

  if (Array.isArray(history)) {
    if (history.length >= 3) return 1;
    if (history.length === 2) return 0;
    if (history.length === 1) return -2;
  }

  const scoreHistory = school.scoreHistory;
  if (scoreHistory && typeof scoreHistory === "object") {
    const count = Object.values(scoreHistory).filter((v) => Number.isFinite(Number(v))).length;
    if (count >= 3) return 1;
    if (count === 2) return 0;
    if (count === 1) return -2;
  }

  return 0;
}

function calculateMatchIndex(scoreDiff, category, school, options = {}) {
  let score = 0;

  if (category === "稳妥") {
    score = calculateSafeFitScore(scoreDiff);
  } else if (category === "保底") {
    score = calculateBackupScore(scoreDiff);
  } else if (category === "冲刺") {
    score = calculateReachScore(scoreDiff);
  } else {
    return null;
  }

  score += getTrendAdjustment(school, category);
  score += getRiskPreferenceAdjustment(options.riskPreference, category);
  score += getDataQualityAdjustment(school);

  if (category === "稳妥") {
    return clamp(Math.round(score), 88, 99);
  }

  if (category === "保底") {
    return clamp(Math.round(score), 72, 88);
  }

  if (category === "冲刺") {
    return clamp(Math.round(score), 45, 82);
  }

  return null;
}

function buildMatchReason(scoreDiff, category, matchIndex, school) {
  const lineName = school.code ? "投档线" : "录取线";
  const line = getAdmissionLine(school);
  const absDiff = formatScore(Math.abs(scoreDiff));

  if (category === "冲刺") {
    return `${lineName}${formatScore(line)}分，高于您${absDiff}分，存在挑战，适合作为冲刺参考`;
  }

  if (category === "稳妥") {
    return `${lineName}${formatScore(line)}分，低于您${absDiff}分，处于最佳匹配区间，匹配指数${matchIndex}`;
  }

  if (category === "保底") {
    return `${lineName}${formatScore(line)}分，低于您${absDiff}分，安全垫较足，但不是最匹配梯队`;
  }

  return "缺少有效录取线";
}

function evaluateSchoolMatch(userScore, school, options = {}) {
  const line = getAdmissionLine(school);

  if (line == null || Number.isNaN(Number(line))) {
    return {
      line: null,
      scoreDiff: null,
      category: "数据不足",
      label: "数据不足",
      matchIndex: null,
      matchReason: "缺少有效录取线",
      reason: "缺少有效录取线",
    };
  }

  const scoreDiff = Number((Number(userScore) - Number(line)).toFixed(1));
  const category = getVolunteerCategory(scoreDiff);
  const matchIndex = calculateMatchIndex(scoreDiff, category, school, options);
  const reason = buildMatchReason(scoreDiff, category, matchIndex, school);

  return {
    line,
    scoreDiff,
    category,
    label: category,
    matchIndex,
    matchReason: reason,
    reason,
  };
}

const categoryPriority = {
  稳妥: 3,
  保底: 2,
  冲刺: 1,
  数据不足: 0,
};

function sortSchoolsByRecommendation(a, b) {
  const pa = categoryPriority[a.category] ?? 0;
  const pb = categoryPriority[b.category] ?? 0;

  if (pa !== pb) {
    return pb - pa;
  }

  if ((b.matchIndex ?? -1) !== (a.matchIndex ?? -1)) {
    return (b.matchIndex ?? -1) - (a.matchIndex ?? -1);
  }

  if (a.scoreDiff != null && b.scoreDiff != null) {
    return Math.abs(a.scoreDiff) - Math.abs(b.scoreDiff);
  }

  return 0;
}

function evaluateAdmissionCandidate(item, score, riskPreference) {
  const match = evaluateSchoolMatch(score, item, { riskPreference });
  return {
    ...item,
    line: match.line,
    scoreDiff: match.scoreDiff,
    category: match.category,
    label: match.label,
    matchIndex: match.matchIndex,
    matchReason: match.reason,
    recommendable: match.category !== "数据不足",
    stars: match.matchIndex == null ? 0 : clamp(Math.ceil(match.matchIndex / 20), 1, 5),
  };
}

window.evaluateSchoolMatch = evaluateSchoolMatch;

function getAvailableDistricts(examMode) {
  if (examMode === "高考") {
    return [{ label: GAOKAO_AREA, value: GAOKAO_AREA }];
  }

  return [
    { label: "全部区域", value: "all" },
    ...ZHONGKAO_DISTRICTS.map((district) => ({
      label: district.name,
      value: district.code,
    })),
  ];
}

function getDistrictLabel(value) {
  if (value === "all") return "全部区域";
  return ZHONGKAO_DISTRICTS.find((district) => district.code === value)?.name || "浦东新区";
}

function filterSchoolsByDistrict(schools, selectedDistrict) {
  if (selectedDistrict === "all") {
    return schools;
  }

  return schools.filter((school) => school.districtCode === selectedDistrict);
}

function calculateDistrictStats(filteredSchools, userScore) {
  const scores = filteredSchools.map(s => s.line ?? s.score2025).filter(v => v != null);
  const avg = scores.length ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
  const highest = filteredSchools
    .filter(s => (s.line ?? s.score2025) != null)
    .reduce((max, s) => ((s.line ?? s.score2025) > (max?.line ?? max?.score2025 ?? -Infinity) ? s : max), null);
  const lowest = filteredSchools
    .filter(s => (s.line ?? s.score2025) != null)
    .reduce((min, s) => ((s.line ?? s.score2025) < (min?.line ?? min?.score2025 ?? Infinity) ? s : min), null);

  return {
    userScore,
    averageLine: avg,
    highest,
    lowest,
    total: filteredSchools.length,
    reachCount: filteredSchools.filter(s => s.category === "冲刺").length,
    safeCount: filteredSchools.filter(s => s.category === "稳妥").length,
    backupCount: filteredSchools.filter(s => s.category === "保底").length,
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

function stabilityScore(item) {
  const values = Object.values(item.scoreHistory || {}).filter(v => typeof v === "number");
  if (values.length < 2) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return clamp(Math.round(96 - Math.sqrt(variance) * 4), 35, 96);
}

function MatchRing({ value, tone = "green" }) {
  const deg = clamp(value ?? 0, 0, 100) * 3.6;
  return (
    <div className={`match-ring ring-${tone}`} style={{"--deg": `${deg}deg`}}>
      <span>{value ?? "-"}</span>
    </div>
  );
}

function recommendationReason(item, mode) {
  return item.matchReason || buildMatchReason(item.scoreDiff, item.category, item.matchIndex, item);
}

function scoreDiffText(scoreDiff) {
  if (scoreDiff == null) return "分差 -";
  return `分差 ${scoreDiff > 0 ? "+" : ""}${formatScore(scoreDiff)}`;
}

function categoryPillClass(category) {
  if (category === "冲刺") return "pill-chong";
  if (category === "稳妥") return "pill-wen";
  if (category === "保底") return "pill-bao";
  return "pill-gray";
}

function matchTone(category) {
  if (category === "冲刺") return "orange";
  if (category === "保底") return "blue";
  return "green";
}

function categoryMeta(category) {
  return {
    冲刺: { title: "冲刺梯队", subtitle: "有一定挑战，适合作为理想目标", tone: "orange", icon: <IconTarget size={22}/> },
    稳妥: { title: "稳妥梯队", subtitle: "分数高度匹配，优先重点考虑", tone: "green", icon: <IconShield size={22}/> },
    保底: { title: "保底梯队", subtitle: "安全垫较足，防止滑档", tone: "blue", icon: <IconShield size={22}/> },
  }[category];
}

function AuthModal({ open, mode, onModeChange, onClose, onSubmit }) {
  const isRegister = mode === "register";
  const [form, setForm] = useState({ phone: "", password: "", name: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm((current) => ({ ...current, password: "", name: "" }));
  }, [open, mode]);

  if (!open) return null;

  const setField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    try {
      onSubmit(form);
    } catch (err) {
      setError(err.message || "操作失败，请稍后重试");
    }
  };

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <section className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="关闭">
          <IconX size={18}/>
        </button>
        <div className="auth-head">
          <div className="auth-icon"><IconUser size={22}/></div>
          <div>
            <h2>{isRegister ? "手机号注册" : "手机号登录"}</h2>
            <p>本地演示账号，后续可接入短信验证码和后端用户系统。</p>
          </div>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span><IconPhone size={14}/>手机号</span>
            <input value={form.phone} onChange={setField("phone")} inputMode="numeric" maxLength="11" placeholder="请输入 11 位手机号"/>
          </label>
          {isRegister && (
            <label className="auth-field">
              <span><IconUser size={14}/>昵称</span>
              <input value={form.name} onChange={setField("name")} placeholder="可选，例如：家长用户"/>
            </label>
          )}
          <label className="auth-field">
            <span><IconLock size={14}/>密码</span>
            <input value={form.password} onChange={setField("password")} type="password" placeholder="至少 6 位"/>
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" type="submit">
            {isRegister ? "注册并登录" : "登录"}
          </button>
        </form>
        <div className="auth-switch">
          {isRegister ? "已有账号？" : "还没有账号？"}
          <button onClick={() => onModeChange(isRegister ? "login" : "register")}>
            {isRegister ? "去登录" : "立即注册"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Hero({ mode, itemCount, districtLabel, authUser, onOpenAuth, onLogout }) {
  const isGaokao = mode === "高考";
  return (
    <header className="hero">
      <div className="hero-topbar">
        {authUser ? (
          <div className="account-chip">
            <span className="account-avatar"><IconUser size={15}/></span>
            <span className="account-name">{authUser.name || maskPhone(authUser.phone)}</span>
            <span className="account-phone">{maskPhone(authUser.phone)}</span>
            <button className="account-logout" onClick={onLogout} title="退出登录">
              <IconLogOut size={15}/>
            </button>
          </div>
        ) : (
          <div className="account-actions">
            <button className="account-btn solid account-btn-wide" onClick={() => onOpenAuth("login")}>
              <IconPhone size={15}/>
              手机号登录 / 注册
            </button>
          </div>
        )}
      </div>
      <div className="hero-grid">
        <div className="hero-left">
          <div className="hero-eyebrow">
            <span className="glyph"><IconTarget size={16} color="#fff"/></span>
            2026年上海{isGaokao ? "高考" : "中考"}志愿填报
          </div>
          <h1 className="hero-title">{isGaokao ? "上海高考本科普通批投档线总览与智能匹配工具" : "上海高中招生数据总览与智能匹配工具"}</h1>
          <p className="hero-sub">基于上海市教育考试院公开录取线，结合个人成绩与偏好，生成冲稳保参考方案</p>
          <div className="hero-actions">
            <button className="btn btn-primary">
              <IconTarget size={16}/>
              开始智能测算
            </button>
            {!authUser && (
              <button className="btn btn-auth-cta" onClick={() => onOpenAuth("login")}>
                <IconPhone size={16}/>
                手机号登录 / 注册
              </button>
            )}
            <button className="btn btn-ghost-dark">
              <IconDatabase size={16}/>
              查看官方数据
            </button>
          </div>
        </div>
        <div className="hero-tiles">
          <HeroTile className="tile-purple" icon={<IconSchool size={14} color="#fff"/>}
                    label={isGaokao ? "院校专业组" : "已接入记录"} value={itemCount} unit={isGaokao ? "组" : "条"} foot={isGaokao ? "官方表逐条录入" : "覆盖上海16区"} />
          <HeroTile className="tile-amber"  icon={<IconMap size={14} color="#fff"/>}
                    label={isGaokao ? "招生批次" : "覆盖区域"} valueText={isGaokao ? GAOKAO_AREA : "上海16区"} foot={isGaokao ? "平行志愿" : "可按区筛选"} />
          <HeroTile className="tile-blue"   icon={<IconCalendar size={14} color="#fff"/>}
                    label="数据年份" valueText={isGaokao ? "2021-2025" : "2022-2025"} foot={isGaokao ? "本科普通批投档线" : "录取最低分数线"} />
          <HeroTile className="tile-green"  icon={<IconDatabase size={14} color="#fff"/>}
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
  const areaOptions = getAvailableDistricts(state.mode);
  return (
    <section className="filter-bar">
      <div className="filter-grid">
        <Field label="模式选择">
          <div className="seg">
            <button className={state.mode === "中考" ? "active" : ""}
                    onClick={() => setState(s => ({ ...s, mode: "中考", area: DEFAULT_DISTRICT, score: DEFAULT_SCORE, sameScore: "不限", nature: "不限" }))}>中考</button>
            <button className={state.mode === "高考" ? "active" : ""}
                    onClick={() => setState(s => ({ ...s, mode: "高考", area: GAOKAO_AREA, score: DEFAULT_GAOKAO_SCORE, sameScore: "不限", nature: "不限" }))}>高考</button>
          </div>
        </Field>
        <Field label={isGaokao ? "招生批次" : "所在区域"}>
          <select className="select" value={state.area} onChange={set("area")}>
            {areaOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
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

function Metrics({ items, mode, stats }) {
  const isGaokao = mode === "高考";
  const avg = stats?.averageLine ?? null;
  const highest580 = isGaokao && items.some(s => s.score2025 == null);
  const highest = stats?.highest ?? null;
  const lowest = stats?.lowest ?? null;
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
          <div className="metric-value">{highest580 ? "580+" : formatScore(highest?.line ?? highest?.score2025)}<span className="unit">分</span></div>
          <div className="metric-foot" style={{color:"#b76b00"}}>{highest580 ? "官方未公开具体分" : highest?.name || "-"}</div>
        </div>
        <div className="metric-art"><ArtCrown/></div>
      </div>
      <div className="metric m-low">
        <div>
          <div className="metric-label">{isGaokao ? "最低投档线" : "最低录取线"}</div>
          <div className="metric-value">{formatScore(lowest?.line ?? lowest?.score2025)}<span className="unit">分</span></div>
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

function EmptyState({ mode, districtLabel }) {
  const isGaokao = mode === "高考";
  return (
    <div className="empty-state">
      <div className="empty-icon"><IconDatabase size={22}/></div>
      <div>
        <strong>{isGaokao ? "暂无可用投档数据" : "该区域暂无可用录取数据"}</strong>
        <span>{isGaokao ? "请检查当前筛选条件。" : "请先在 sources 文件夹中补充该区官方录取 PDF，并执行数据解析脚本。"}</span>
      </div>
    </div>
  );
}

function SchoolRow({ s }) {
  const pillCls = categoryPillClass(s.category);
  return (
    <div className="ladder-row">
      <div className="ladder-rank">
        {s.rank <= 3 ? <div className="rank-medal"><Medal rank={s.rank}/></div> : s.rank}
      </div>
      <div className="ladder-school">
        <div className="logo" style={{background: s.logoBg, color: "#fff"}}>{s.logoText}</div>
        <div className="school-name-row">
          <span className="school-name">{s.name}</span>
          {s.tags.map((t, i) => (
            <span key={i} className={`tag tag-${t.kind}`}>{t.label}</span>
          ))}
        </div>
      </div>
      <div className="ladder-cell">
        <span className={`pill ${pillCls}`}>{s.category}</span>
        <span className="mini-text">{historyText(s.scoreHistory, [2022, 2023, 2024])}</span>
      </div>
      <div className="ladder-score">
        <strong>{formatScore(s.line)}</strong>
        <span>{scoreDiffText(s.scoreDiff)}</span>
      </div>
      <div className="ladder-ring">
        <MatchRing value={s.matchIndex} tone={matchTone(s.category)}/>
      </div>
      <div className="ladder-reason">
        <strong>{recommendationReason(s, "中考")}</strong>
        <span>语数外 {formatScore(s.ysw2025)}，趋势{trendLabel(s.trend)}</span>
      </div>
      <div className="ladder-actions">
        <button className="btn-detail">查看</button>
      </div>
    </div>
  );
}

function SchoolTable({ items, sort, setSort, districtLabel }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          名额分配到区录取线 <span className="count">（共 {items.length} 所符合条件）</span>
        </div>
        <div className="sort">
          排序：
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommendation">推荐排序</option>
            <option value="index">按指数数值排序</option>
            <option value="score">2025录取线</option>
            <option value="ysw">语数外</option>
            <option value="delta">涨幅</option>
          </select>
        </div>
      </div>
      <div className="school-list">
        {items.length ? (
          <GroupedRows
            items={items}
            unit="所"
            renderItem={(s) => <SchoolRow key={s.id} s={s}/>}
          />
        ) : (
          <EmptyState mode="中考" districtLabel={districtLabel}/>
        )}
      </div>
      <div className="more">数据来源：上海市教育考试院 2022-2025 年{districtLabel}名额分配到区录取最低分数线 <IconChevronDown size={14}/></div>
    </section>
  );
}

function ProgramRow({ p }) {
  const pillCls = categoryPillClass(p.category);
  return (
    <div className="ladder-row">
      <div className="ladder-rank">{p.rank <= 3 ? <div className="rank-medal"><Medal rank={p.rank}/></div> : p.rank}</div>
      <div className="ladder-school">
        <div className="logo" style={{background: "#324a7a", color: "#fff"}}>{p.name.slice(0, 1)}</div>
        <div className="school-name-row">
          <span className="school-name">{p.name}</span>
          <span className="tag tag-blue">{p.code}</span>
          {p.score2025 == null && <span className="tag tag-orange">580分及以上</span>}
        </div>
      </div>
      <div className="ladder-cell">
        <span className={`pill ${pillCls}`}>{p.category}</span>
        <span className="mini-text">{historyText(p.scoreLabelHistory, [2021, 2022, 2023, 2024])}</span>
      </div>
      <div className="ladder-score">
        <strong>{formatScore(p.line)}</strong>
        <span>{scoreDiffText(p.scoreDiff)}</span>
      </div>
      <div className="ladder-ring">
        <MatchRing value={p.matchIndex} tone={matchTone(p.category)}/>
      </div>
      <div className="ladder-reason">
        <strong>{recommendationReason(p, "高考")}</strong>
        <span>语数合计 {formatScore(p.cnMath2025)}，趋势{trendLabel(p.trend)}</span>
      </div>
      <div className="ladder-actions">
        <button className="btn-detail">查看</button>
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
            <option value="recommendation">推荐排序</option>
            <option value="index">按指数数值排序</option>
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

function namesFor(items, category) {
  const xs = items
    .filter(s => s.category === category)
    .slice()
    .sort((a, b) => (b.matchIndex ?? -1) - (a.matchIndex ?? -1))
    .slice(0, 3)
    .map(s => s.name);
  return xs.length ? xs.join("、") : "暂无匹配学校";
}

function CategorySection({ category, items, unit, children }) {
  if (!items.length) return null;
  const meta = categoryMeta(category);
  return (
    <div className={`bucket-section category-${category} bucket-tone-${meta.tone}`}>
      <div className="bucket-head">
        <span className="bucket-icon">{meta.icon}</span>
        <div className="bucket-title-wrap">
          <div className="bucket-title">{meta.title}</div>
          <div className="bucket-desc">{meta.subtitle}</div>
        </div>
        <span className="bucket-count">{items.length} {unit}</span>
      </div>
      <div className="ladder-table-head">
        <span>序号</span>
        <span>学校名称</span>
        <span>层次</span>
        <span>统招线</span>
        <span>匹配</span>
        <span>推荐理由</span>
        <span>操作</span>
      </div>
      {children}
    </div>
  );
}

function GroupedRows({ items, unit, renderItem }) {
  return (
    <>
      {["稳妥", "保底", "冲刺"].map((category) => {
        const categoryItems = items.filter(item => item.category === category);
        return (
          <CategorySection key={category} category={category} items={categoryItems} unit={unit}>
            {categoryItems.map(renderItem)}
          </CategorySection>
        );
      })}
    </>
  );
}

function AISidebar({ items, score, mode, stats, districtLabel }) {
  const isGaokao = mode === "高考";
  const chong = stats?.reachCount ?? 0;
  const wen = stats?.safeCount ?? 0;
  const bao = stats?.backupCount ?? 0;
  const unit = isGaokao ? "组" : "所";
  const sourceUrl = isGaokao ? GAOKAO_DATA_SOURCES[0].url : (items[0]?.source?.url || DATA_SOURCES[0]?.url);
  const hasData = items.length > 0;
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
        {hasData ? (
          <div className="analysis">
            当前预估分数 <span className="hl">{formatScore(score)} 分</span>。本页按2025年{isGaokao ? "投档线" : "录取线"}估算冲稳保分层：
            <span className="hl"> 冲 {chong} {unit} · 稳 {wen} {unit} · 保 {bao} {unit}</span>。分层仅用于排序和筛选参考，正式填报仍需结合招生计划、批次规则和学校简章。
          </div>
        ) : (
          <div className="analysis">
            当前{isGaokao ? "筛选条件" : districtLabel}数据不足，暂无法生成可靠志愿建议。
          </div>
        )}

        <div className="section-label" style={{marginTop:18}}><span className="bar"></span>志愿填报建议</div>
        <div className="advice-list">
          <div className="advice-item">
            <div className="advice-num">1</div>
            <div><strong>冲刺参考：</strong>{hasData ? namesFor(items, "冲刺") : "暂无可用数据"}</div>
          </div>
          <div className="advice-item">
            <div className="advice-num">2</div>
            <div><strong>稳妥参考：</strong>{hasData ? namesFor(items, "稳妥") : "暂无可用数据"}</div>
          </div>
          <div className="advice-item">
            <div className="advice-num">3</div>
            <div><strong>保底参考：</strong>{hasData ? namesFor(items, "保底") : "暂无可用数据"}</div>
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
    area: DEFAULT_DISTRICT,
    score: DEFAULT_SCORE,
    risk: "均衡",
    sameScore: "不限",
    nature: "不限",
    trendFilter: "不限",
    search: "",
  });
  const [sort, setSort] = useState("recommendation");
  const [authUser, setAuthUser] = useState(() => getInitialAuthUser());
  const [authDialog, setAuthDialog] = useState({ open: false, mode: "login" });

  const isGaokao = state.mode === "高考";
  const districtLabel = isGaokao ? GAOKAO_AREA : getDistrictLabel(state.area);
  const score = Number.parseFloat(state.score) || Number.parseFloat(isGaokao ? DEFAULT_GAOKAO_SCORE : DEFAULT_SCORE);

  const items = useMemo(() => {
    let xs = isGaokao
      ? GAOKAO_PROGRAMS.map(p => evaluateAdmissionCandidate(p, score, state.risk)).filter(p => {
          if (!p.recommendable) return false;
          if (state.search && !p.name.includes(state.search) && !p.code.includes(state.search)) return false;
          if (state.sameScore === "580分及以上" && p.score2025 != null) return false;
          if (state.sameScore === "580分以下" && p.score2025 == null) return false;
          if (state.nature === "有2024对照" && p.score2024Label == null) return false;
          if (state.nature === "2025新增或无同码" && p.score2024Label != null) return false;
          if (state.trendFilter !== "不限" && p.trend !== state.trendFilter) return false;
          return true;
        })
      : filterSchoolsByDistrict(SCHOOLS, state.area).map(s => evaluateAdmissionCandidate(s, score, state.risk)).filter(s => {
          if (!s.recommendable) return false;
          if (state.search && !s.name.includes(state.search)) return false;
          if (state.nature !== "不限" && s.nature !== state.nature) return false;
          if (state.sameScore !== "不限" && s.sameScore2025 !== state.sameScore) return false;
          if (state.trendFilter !== "不限" && s.trend !== state.trendFilter) return false;
          return true;
        });
    const scoreValue = (x) => x.line ?? x.score2025 ?? -1;
    const yswValue = (x) => isGaokao ? (x.cnMath2025 ?? -1) : (x.ysw2025 ?? -1);
    if (sort === "recommendation") xs = xs.slice().sort(sortSchoolsByRecommendation);
    if (sort === "index") xs = xs.slice().sort((a,b) => (b.matchIndex ?? -1) - (a.matchIndex ?? -1) || sortSchoolsByRecommendation(a, b));
    if (sort === "score") xs = xs.slice().sort((a,b) => scoreValue(b) - scoreValue(a));
    if (sort === "ysw") xs = xs.slice().sort((a,b) => yswValue(b) - yswValue(a));
    if (sort === "delta") xs = xs.slice().sort((a,b) => (b.delta ?? -999) - (a.delta ?? -999));
    return xs;
  }, [state, sort, score, isGaokao]);

  const stats = useMemo(() => calculateDistrictStats(items, score), [items, score]);
  const zhongkaoItemCount = useMemo(
    () => SCHOOLS.filter(s => s.score2025 != null).length,
    []
  );

  useEffect(() => {
    const signature = `${state.mode}-${score}-${state.risk}-${items.length}`;
    if (window.__LAST_MATCH_DEBUG__ === signature) return;
    window.__LAST_MATCH_DEBUG__ = signature;

    const testCases = [
      { userScore: 710, line: 730, expectedCategory: "冲刺" },
      { userScore: 710, line: 715, expectedCategory: "冲刺" },
      { userScore: 710, line: 710, expectedCategory: "稳妥" },
      { userScore: 710, line: 705, expectedCategory: "稳妥" },
      { userScore: 710, line: 702.5, expectedCategory: "稳妥" },
      { userScore: 710, line: 698, expectedCategory: "稳妥" },
      { userScore: 710, line: 695, expectedCategory: "保底" },
      { userScore: 710, line: 678.5, expectedCategory: "保底" },
    ];

    console.table(testCases.map((test) => {
      const match = evaluateSchoolMatch(test.userScore, { name: `line ${test.line}`, score2025: test.line }, { riskPreference: state.risk });
      return {
        line: test.line,
        scoreDiff: match.scoreDiff,
        category: match.category,
        expectedCategory: test.expectedCategory,
        matchIndex: match.matchIndex,
      };
    }));

    console.table(
      items.map(s => ({
        name: s.name,
        line: s.line,
        scoreDiff: s.scoreDiff,
        category: s.category,
        matchIndex: s.matchIndex,
      }))
    );
  }, [items, score, state.mode, state.risk]);

  const onReset = () => setState({
    mode: "中考", area: DEFAULT_DISTRICT, score: DEFAULT_SCORE, risk: "均衡",
    sameScore: "不限", nature: "不限", trendFilter: "不限", search: "",
  });

  const openAuth = (mode) => setAuthDialog({ open: true, mode });
  const closeAuth = () => setAuthDialog((current) => ({ ...current, open: false }));
  const changeAuthMode = (mode) => setAuthDialog({ open: true, mode });
  const handleAuthSubmit = (form) => {
    const user = authDialog.mode === "register"
      ? registerLocalUser(form)
      : loginLocalUser(form);
    setAuthUser(user);
    closeAuth();
  };
  const handleLogout = () => {
    clearAuthSession();
    setAuthUser(null);
  };

  return (
    <div className="page">
      <Hero
        mode={state.mode}
        itemCount={isGaokao ? GAOKAO_PROGRAMS.length : zhongkaoItemCount}
        districtLabel={districtLabel}
        authUser={authUser}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
      />
      <div className="shell">
        <FilterBar state={state} setState={setState} onReset={onReset}/>
        <Metrics items={items} mode={state.mode} stats={stats}/>
        <div className="main">
          {isGaokao
            ? <ProgramTable items={items} sort={sort} setSort={setSort}/>
            : <SchoolTable items={items} sort={sort} setSort={setSort} districtLabel={districtLabel}/>}
          <AISidebar items={items} score={score} mode={state.mode} stats={stats} districtLabel={districtLabel}/>
        </div>
      </div>
      <AuthModal
        open={authDialog.open}
        mode={authDialog.mode}
        onModeChange={changeAuthMode}
        onClose={closeAuth}
        onSubmit={handleAuthSubmit}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
