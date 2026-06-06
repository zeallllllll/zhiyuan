const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const sourcesDir = path.join(rootDir, "sources");
const parsedDir = path.join(sourcesDir, "parsed");
const jsonOut = path.join(rootDir, "src", "data", "shanghai-zk-admission-lines.json");
const dataJsOut = path.join(rootDir, "data.js");
const extractor = path.join(__dirname, "extract-pdf-text.py");

const YEARS = [2022, 2023, 2024, 2025];

const DISTRICTS = [
  { code: "huangpu", name: "黄浦区", index: 1, govCode: "310101" },
  { code: "xuhui", name: "徐汇区", index: 2, govCode: "310104" },
  { code: "changning", name: "长宁区", index: 3, govCode: "310105" },
  { code: "jingan", name: "静安区", index: 4, govCode: "310106" },
  { code: "putuo", name: "普陀区", index: 5, govCode: "310107" },
  { code: "hongkou", name: "虹口区", index: 6, govCode: "310109" },
  { code: "yangpu", name: "杨浦区", index: 7, govCode: "310110" },
  { code: "minhang", name: "闵行区", index: 8, govCode: "310112" },
  { code: "baoshan", name: "宝山区", index: 9, govCode: "310113" },
  { code: "jiading", name: "嘉定区", index: 10, govCode: "310114" },
  { code: "pudong", name: "浦东新区", index: 11, govCode: "310115" },
  { code: "jinshan", name: "金山区", index: 12, govCode: "310116" },
  { code: "songjiang", name: "松江区", index: 13, govCode: "310117" },
  { code: "qingpu", name: "青浦区", index: 14, govCode: "310118" },
  { code: "fengxian", name: "奉贤区", index: 15, govCode: "310120" },
  { code: "chongming", name: "崇明区", index: 16, govCode: "310151" },
];

const SCHOOL_ALIASES = {
  "华东师范大学第二附属中学（紫竹校区）": "华东师范大学第二附属中学闵行紫竹分校",
  "上海市复兴高级中学": "复旦大学附属复兴中学",
};

function sourceUrl(year, district) {
  if (year === 2025) return `https://www.shmeea.edu.cn/download/20250714/1/${district.index}.pdf`;
  if (year === 2024) return `https://www.shmeea.edu.cn/download/20240715/00/${district.govCode}.pdf`;
  if (year === 2023) return `https://www.shmeea.edu.cn/download/20230723/1-${String(district.index).padStart(3, "0")}.pdf`;
  if (year === 2022) {
    const suffix = district.index <= 9 ? String(district.index).padStart(2, "0") : String(district.index);
    return `https://www.shmeea.edu.cn/download/20220810/17304321/${suffix}.pdf`;
  }
  return "";
}

function sourceFile(year, district) {
  return `sources/shmeea-${year}-${district.code}-mingedaoqu.pdf`;
}

function isNumberLine(value) {
  return /^\d+(?:\.\d+)?$/.test(value);
}

function toNumber(value) {
  return Number(value);
}

function isIgnoredLine(value) {
  return (
    !value ||
    value === "区名称" ||
    value === "招生学校" ||
    value === "末位录取考生成绩" ||
    value === "语数外" ||
    value === "数学" ||
    value === "语文" ||
    value === "综合测试" ||
    value === "录取最低分" ||
    value === "是否同" ||
    value === "分优待" ||
    value === "综合素质" ||
    value === "评价" ||
    value.includes("录取最低分") ||
    value.includes("学业考总成绩") ||
    value.includes("上海市教育考试院") ||
    value.includes("第 ") ||
    value.includes("注：") ||
    value.includes("备注：")
  );
}

function normalizeSchoolName(name) {
  const compact = name.replace(/\s+/g, "");
  return SCHOOL_ALIASES[compact] || compact;
}

function extractText(pdfPath) {
  const result = spawnSync("python", [extractor, pdfPath], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to extract ${pdfPath}`);
  }

  return result.stdout;
}

function parseRows(text, year, district, fileName, url) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] !== district.name) continue;

    let cursor = i + 1;
    const nameParts = [];

    while (cursor < lines.length && !isNumberLine(lines[cursor])) {
      if (lines[cursor] === district.name) break;
      if (!isIgnoredLine(lines[cursor])) nameParts.push(lines[cursor]);
      cursor += 1;
    }

    if (!nameParts.length || !isNumberLine(lines[cursor])) continue;

    const numbers = [];
    while (cursor < lines.length && numbers.length < 5 && isNumberLine(lines[cursor])) {
      numbers.push(toNumber(lines[cursor]));
      cursor += 1;
    }

    const hasOnlyLineAndSameScore = numbers.length === 1 && (lines[cursor] === "是" || lines[cursor] === "否");
    if (numbers.length < 5 && !hasOnlyLineAndSameScore) {
      console.warn(`[WARN] ${fileName}: skipped incomplete row near line ${i + 1}`);
      continue;
    }

    while (numbers.length < 5) numbers.push(null);

    let sameScorePriority = null;
    let qualityScore = year === 2025 ? null : 50;

    if (year >= 2023 && (lines[cursor] === "是" || lines[cursor] === "否")) {
      sameScorePriority = lines[cursor] === "是";
      cursor += 1;
    }

    if (year === 2025 && isNumberLine(lines[cursor])) {
      qualityScore = toNumber(lines[cursor]);
      cursor += 1;
    }

    rows.push({
      districtCode: district.code,
      districtName: district.name,
      schoolName: normalizeSchoolName(nameParts.join("")),
      year,
      admissionScore: numbers[0],
      chineseMathEnglish: numbers[1],
      math: numbers[2],
      chinese: numbers[3],
      comprehensive: numbers[4],
      sameScorePriority,
      qualityScore,
      sourceFile: fileName,
      sourceUrl: url,
    });

    i = cursor - 1;
  }

  return rows;
}

function hashName(name) {
  let hash = 0;
  for (const ch of name) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function buildDataset(rows) {
  const districtMap = new Map(DISTRICTS.map((district) => [district.code, {
    districtCode: district.code,
    districtName: district.name,
    schools: new Map(),
  }]));

  for (const row of rows) {
    const district = districtMap.get(row.districtCode);
    const schoolKey = row.schoolName;
    if (!district.schools.has(schoolKey)) {
      district.schools.set(schoolKey, {
        schoolId: `${row.districtCode}_${hashName(row.schoolName)}`,
        schoolName: row.schoolName,
        schoolType: "公办",
        admissionType: "名额分配到区",
        sameScorePriority: false,
        scores: {},
        subjects: {},
        sourceFiles: [],
        sourceUrls: [],
      });
    }

    const school = district.schools.get(schoolKey);
    school.scores[String(row.year)] = row.admissionScore;
    school.subjects[String(row.year)] = {
      chineseMathEnglish: row.chineseMathEnglish,
      math: row.math,
      chinese: row.chinese,
      comprehensive: row.comprehensive,
      sameScorePriority: row.sameScorePriority,
      qualityScore: row.qualityScore,
    };
    school.sameScorePriority = school.sameScorePriority || row.sameScorePriority === true;
    if (!school.sourceFiles.includes(row.sourceFile)) school.sourceFiles.push(row.sourceFile);
    if (!school.sourceUrls.includes(row.sourceUrl)) school.sourceUrls.push(row.sourceUrl);
  }

  return {
    exam: "zhongkao",
    city: "上海市",
    years: YEARS,
    districts: Array.from(districtMap.values()).map((district) => ({
      districtCode: district.districtCode,
      districtName: district.districtName,
      schools: Array.from(district.schools.values()),
    })),
  };
}

function buildDataJs(dataset, sources) {
  return `/* Official Shanghai zhongkao score dataset for the dashboard. */\n` +
`const ZHONGKAO_DISTRICTS = ${JSON.stringify(DISTRICTS.map(({ code, name }) => ({ code, name })), null, 2)};\n\n` +
`const DATA_SOURCES = ${JSON.stringify(sources, null, 2)};\n\n` +
`const SHANGHAI_ZK_ADMISSION_LINES = ${JSON.stringify(dataset, null, 2)};\n\n` +
`const LOGO_COLORS = [\n` +
`  "#1a3a5f", "#7a1a1a", "#0c4a8b", "#9c1a1a", "#1f6b3a", "#5c2d82",\n` +
`  "#8a4a12", "#144f63", "#63401b", "#324a7a", "#8b1d39", "#17624f",\n` +
`];\n\n` +
`function formatScoreValue(v) {\n` +
`  if (v == null) return null;\n` +
`  return Number(v).toFixed(1).replace(/\\.0$/, "");\n` +
`}\n\n` +
`function logoTextFor(name) {\n` +
`  const prefixes = ["上海市", "上海", "复旦大学", "华东师范大学", "上海交通大学", "上海财经大学", "上海师范大学"];\n` +
`  let text = name;\n` +
`  for (const prefix of prefixes) {\n` +
`    if (text.startsWith(prefix)) {\n` +
`      text = text.slice(prefix.length);\n` +
`      break;\n` +
`    }\n` +
`  }\n` +
`  return text.slice(0, 1);\n` +
`}\n\n` +
`function tagsFor(score2025, districtName) {\n` +
`  const base = [{ label: districtName, kind: "blue" }];\n` +
`  if (score2025 >= 750) return [...base, { label: "750+高分段", kind: "orange" }];\n` +
`  if (score2025 >= 735) return [...base, { label: "735+高分段", kind: "teal" }];\n` +
`  return base;\n` +
`}\n\n` +
`function trendFromDelta(delta) {\n` +
`  if (delta == null) return "new";\n` +
`  if (delta > 0) return "up";\n` +
`  if (delta < 0) return "down";\n` +
`  return "flat";\n` +
`}\n\n` +
`const SCHOOLS = SHANGHAI_ZK_ADMISSION_LINES.districts.flatMap((district) =>\n` +
`  district.schools.map((school, index) => {\n` +
`    const scores = school.scores || {};\n` +
`    const subjects2025 = school.subjects?.["2025"] || {};\n` +
`    const score2022 = scores["2022"] ?? null;\n` +
`    const score2023 = scores["2023"] ?? null;\n` +
`    const score2024 = scores["2024"] ?? null;\n` +
`    const score2025 = scores["2025"] ?? null;\n` +
`    const delta = score2024 == null || score2025 == null ? null : Number((score2025 - score2024).toFixed(1));\n` +
`    const latestSource = DATA_SOURCES.find((source) => source.year === 2025 && source.districtCode === district.districtCode) || DATA_SOURCES[0];\n` +
`    return {\n` +
`      id: school.schoolId,\n` +
`      rank: index + 1,\n` +
`      name: school.schoolName,\n` +
`      tags: tagsFor(score2025, district.districtName),\n` +
`      area: district.districtName,\n` +
`      districtCode: district.districtCode,\n` +
`      districtName: district.districtName,\n` +
`      nature: school.schoolType || "公办",\n` +
`      boarding: "以学校公布为准",\n` +
`      admissionType: school.admissionType,\n` +
`      blurb: \`2025名额分配到区录取线 \${formatScoreValue(score2025)} 分，末位语数外 \${formatScoreValue(subjects2025.chineseMathEnglish)} 分。\`,\n` +
`      scoreHistory: { 2022: score2022, 2023: score2023, 2024: score2024, 2025: score2025 },\n` +
`      score2022,\n` +
`      score2023,\n` +
`      score2024,\n` +
`      score2025,\n` +
`      delta,\n` +
`      trend: trendFromDelta(delta),\n` +
`      ysw2025: subjects2025.chineseMathEnglish ?? null,\n` +
`      math2025: subjects2025.math ?? null,\n` +
`      chinese2025: subjects2025.chinese ?? null,\n` +
`      test2025: subjects2025.comprehensive ?? null,\n` +
`      sameScore2025: subjects2025.sameScorePriority === true ? "是" : "否",\n` +
`      quality2025: subjects2025.qualityScore ?? null,\n` +
`      style: trendFromDelta(delta),\n` +
`      logoBg: LOGO_COLORS[index % LOGO_COLORS.length],\n` +
`      logoText: logoTextFor(school.schoolName),\n` +
`      source: latestSource,\n` +
`      sourceFiles: school.sourceFiles,\n` +
`      sourceUrls: school.sourceUrls,\n` +
`    };\n` +
`  })\n` +
`);\n\n` +
`window.DATA_SOURCES = DATA_SOURCES;\n` +
`window.ZHONGKAO_DISTRICTS = ZHONGKAO_DISTRICTS;\n` +
`window.SHANGHAI_ZK_ADMISSION_LINES = SHANGHAI_ZK_ADMISSION_LINES;\n` +
`window.SCHOOLS = SCHOOLS;\n`;
}

function main() {
  fs.mkdirSync(parsedDir, { recursive: true });
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });

  const rows = [];
  const sources = [];
  const missing = [];

  for (const district of DISTRICTS) {
    for (const year of YEARS) {
      const fileName = sourceFile(year, district);
      const pdfPath = path.join(rootDir, fileName);
      const url = sourceUrl(year, district);

      sources.push({
        year,
        districtCode: district.code,
        districtName: district.name,
        title: `${year}年上海市高中学校“名额分配到区”招生录取最低分数线（${district.name}）`,
        publisher: "上海市教育考试院",
        url,
        file: fileName,
        status: fs.existsSync(pdfPath) ? "已下载，已解析" : "缺失",
      });

      if (!fs.existsSync(pdfPath)) {
        missing.push(fileName);
        continue;
      }

      const text = extractText(pdfPath);
      fs.writeFileSync(path.join(parsedDir, path.basename(fileName, ".pdf") + ".txt"), text, "utf8");

      const parsedRows = parseRows(text, year, district, fileName, url);
      if (!parsedRows.length) {
        console.warn(`[WARN] ${fileName}: no rows parsed, needs manual review`);
      }
      rows.push(...parsedRows);
      console.log(`${fileName}: ${parsedRows.length} rows`);
    }
  }

  if (missing.length) {
    console.warn(`[WARN] Missing PDFs:\n${missing.join("\n")}`);
  }

  const dataset = buildDataset(rows);
  fs.writeFileSync(jsonOut, JSON.stringify(dataset, null, 2) + "\n", "utf8");
  fs.writeFileSync(dataJsOut, buildDataJs(dataset, sources), "utf8");
  console.log(`Wrote ${path.relative(rootDir, jsonOut)}`);
  console.log(`Wrote ${path.relative(rootDir, dataJsOut)}`);
}

main();
