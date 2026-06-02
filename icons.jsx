/* SVG icon components - lucide-style strokes */
const Icon = ({ children, size = 16, stroke = 2, color = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
       stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       className="i-inline">
    {children}
  </svg>
);

const IconSchool = (p) => (
  <Icon {...p}>
    <path d="M14 22v-4a2 2 0 1 0-4 0v4"/>
    <path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/>
    <path d="M18 5v17"/>
    <path d="m4 6 8-4 8 4"/>
    <path d="M6 5v17"/>
    <circle cx="12" cy="9" r="2"/>
  </Icon>
);
const IconMap = (p) => (
  <Icon {...p}>
    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>
    <path d="M15 5.764v15"/>
    <path d="M9 3.236v15"/>
  </Icon>
);
const IconCalendar = (p) => (
  <Icon {...p}>
    <path d="M8 2v4"/>
    <path d="M16 2v4"/>
    <rect width="18" height="18" x="3" y="4" rx="2"/>
    <path d="M3 10h18"/>
  </Icon>
);
const IconLayers = (p) => (
  <Icon {...p}>
    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
    <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/>
    <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>
  </Icon>
);
const IconSparkles = (p) => (
  <Icon {...p}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    <path d="M20 3v4"/>
    <path d="M22 5h-4"/>
    <path d="M4 17v2"/>
    <path d="M5 18H3"/>
  </Icon>
);
const IconCrown = (p) => (
  <Icon {...p}>
    <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>
    <path d="M5 21h14"/>
  </Icon>
);
const IconShield = (p) => (
  <Icon {...p}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    <path d="m9 12 2 2 4-4"/>
  </Icon>
);
const IconTarget = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </Icon>
);
const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </Icon>
);
const IconPin = (p) => (
  <Icon {...p}>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
    <circle cx="12" cy="10" r="3"/>
  </Icon>
);
const IconBook = (p) => (
  <Icon {...p}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </Icon>
);
const IconDatabase = (p) => (
  <Icon {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v14a9 3 0 0 0 18 0V5"/>
    <path d="M3 12a9 3 0 0 0 18 0"/>
  </Icon>
);
const IconChevronRight = (p) => (
  <Icon {...p}>
    <path d="m9 18 6-6-6-6"/>
  </Icon>
);
const IconChevronDown = (p) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6"/>
  </Icon>
);
const IconAlert = (p) => (
  <Icon {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
    <path d="M12 9v4"/>
    <path d="M12 17h.01"/>
  </Icon>
);
const IconTrendUp = (p) => (
  <Icon {...p}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </Icon>
);
const IconStar = ({ size = 12, filled = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className="i-inline">
    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
  </svg>
);

/* medal (gold/silver/bronze) for top 3 */
const Medal = ({ rank }) => {
  const colors = {
    1: ["#ffd54a", "#f59e0b"],
    2: ["#dde2ec", "#a4abba"],
    3: ["#f0b88a", "#c47a3a"],
  };
  const [c1, c2] = colors[rank] || colors[1];
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={`med${rank}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={c1}/>
          <stop offset="100%" stopColor={c2}/>
        </linearGradient>
      </defs>
      <path d="M9 2 L12 11 H4 Z" fill={c2} opacity="0.85"/>
      <path d="M23 2 L20 11 H28 Z" fill={c2} opacity="0.85"/>
      <circle cx="16" cy="20" r="9.5" fill={`url(#med${rank})`} stroke="#fff" strokeWidth="1.5"/>
      <text x="16" y="24" textAnchor="middle" fontSize="11" fontWeight="800"
            fill="#fff" style={{fontFamily: "var(--font-num)"}}>
        {rank}
      </text>
    </svg>
  );
};

/* sparkline used in 平均录取线 metric */
const Sparkline = () => (
  <svg className="sparkline" viewBox="0 0 140 50" fill="none">
    <defs>
      <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#a08fff" stopOpacity="0.35"/>
        <stop offset="100%" stopColor="#a08fff" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <path d="M0,38 L20,30 L40,34 L60,22 L80,16 L100,20 L120,10 L140,14 L140,50 L0,50 Z" fill="url(#sparkFill)"/>
    <path d="M0,38 L20,30 L40,34 L60,22 L80,16 L100,20 L120,10 L140,14" stroke="#6c5ce7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="80" cy="16" r="3" fill="#6c5ce7" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="120" cy="10" r="3" fill="#6c5ce7" stroke="#fff" strokeWidth="1.5"/>
  </svg>
);

/* crown / shield / target ornaments for metric cards */
const ArtCrown = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="crownG" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#ffd34d"/>
        <stop offset="100%" stopColor="#f08a1a"/>
      </linearGradient>
    </defs>
    <path d="M14 20 L20 38 H44 L50 20 L40 28 L32 16 L24 28 Z" fill="url(#crownG)" stroke="#c47010" strokeWidth="1.2" strokeLinejoin="round"/>
    <rect x="20" y="40" width="24" height="4" rx="1" fill="#e0850c"/>
    <circle cx="14" cy="20" r="2.5" fill="#ffe27a"/>
    <circle cx="50" cy="20" r="2.5" fill="#ffe27a"/>
    <circle cx="32" cy="14" r="2.5" fill="#ffe27a"/>
  </svg>
);

const ArtShield = () => (
  <svg width="58" height="64" viewBox="0 0 58 64" fill="none">
    <defs>
      <linearGradient id="shieldG" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#5b9bff"/>
        <stop offset="100%" stopColor="#3a6bff"/>
      </linearGradient>
    </defs>
    <path d="M29 4 C20 8 12 9 6 9 V30 C6 44 17 54 29 60 C41 54 52 44 52 30 V9 C46 9 38 8 29 4 Z"
          fill="url(#shieldG)" stroke="#2a51c4" strokeWidth="1.2"/>
    <path d="M20 32 L26 38 L38 24" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const ArtTarget = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="tgtG" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#4ad693"/>
        <stop offset="100%" stopColor="#1da671"/>
      </linearGradient>
    </defs>
    <circle cx="30" cy="34" r="20" stroke="url(#tgtG)" strokeWidth="3" fill="#f3fbf6"/>
    <circle cx="30" cy="34" r="12" stroke="url(#tgtG)" strokeWidth="2.5" fill="none"/>
    <circle cx="30" cy="34" r="5" fill="url(#tgtG)"/>
    {/* arrow */}
    <path d="M30 34 L52 12" stroke="#1da671" strokeWidth="3" strokeLinecap="round"/>
    <path d="M48 8 L54 10 L52 16" stroke="#1da671" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const Stars = ({ n }) => (
  <span className="stars">
    {[1,2,3,4,5].map(i => (
      <span key={i} className={i <= n ? "" : "off"}>
        <IconStar size={11} filled={true}/>
      </span>
    ))}
  </span>
);

window.IconSchool = IconSchool;
window.IconMap = IconMap;
window.IconCalendar = IconCalendar;
window.IconLayers = IconLayers;
window.IconSparkles = IconSparkles;
window.IconCrown = IconCrown;
window.IconShield = IconShield;
window.IconTarget = IconTarget;
window.IconSearch = IconSearch;
window.IconPin = IconPin;
window.IconBook = IconBook;
window.IconDatabase = IconDatabase;
window.IconChevronRight = IconChevronRight;
window.IconChevronDown = IconChevronDown;
window.IconAlert = IconAlert;
window.IconTrendUp = IconTrendUp;
window.IconStar = IconStar;
window.Medal = Medal;
window.Sparkline = Sparkline;
window.ArtCrown = ArtCrown;
window.ArtShield = ArtShield;
window.ArtTarget = ArtTarget;
window.Stars = Stars;
