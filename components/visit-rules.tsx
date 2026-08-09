import { attendanceRules, type AttendanceRuleIcon } from "@/content/rules";

function RuleGlyph({ icon }: { icon: AttendanceRuleIcon }) {
  switch (icon) {
    case "knife":
      return (
        <g>
          <path d="M43 72 74 41c7-7 13-16 15-25 1-4-3-6-6-3L28 68" />
          <path d="M28 73 16 85c-3 3-3 8 0 11s8 3 11 0l12-12" />
          <path d="m31 64 16 16" />
          <path d="M19 84 7 96" />
        </g>
      );
    case "firearm":
      return (
        <g>
          <path d="M18 42h48c8 0 14 6 14 13H31" />
          <path d="M66 42V31h13v11" />
          <path d="M31 55c0 10-6 15-13 20-5 4-4 11 3 12h16l8-32" />
          <path d="M80 47h11v8H80" />
          <path d="M48 55c0 8 5 13 13 13" />
          <path d="M48 55h13" />
          <circle cx="38" cy="56" r="3.5" />
        </g>
      );
    case "aerosol":
      return (
        <g>
          <path d="M40 39h23v54H40z" />
          <path d="M45 27h13v12H45z" />
          <path d="M42 27h19" />
          <path d="M44 52h14" />
          <path d="M44 80h14" />
          <circle cx="74" cy="28" r="2.2" />
          <circle cx="82" cy="24" r="2.2" />
          <circle cx="84" cy="34" r="2.2" />
          <circle cx="92" cy="29" r="2.2" />
          <circle cx="73" cy="39" r="2.2" />
          <circle cx="92" cy="41" r="2.2" />
        </g>
      );
    case "flammable":
      return (
        <g>
          <path d="M58 97c18-6 29-19 29-37 0-13-6-24-16-33 0 12-6 21-16 27 2-15-3-28-15-40 0 18-14 29-22 43-9 18 1 35 21 40" />
          <path d="M52 97c10-4 17-12 17-23 0-8-4-15-10-21 0 8-5 14-12 18 1-9-2-17-10-25 0 11-8 18-13 28-6 11 0 20 11 23" />
        </g>
      );
    case "luggage":
      return (
        <g>
          <rect x="25" y="35" width="62" height="55" rx="8" />
          <path d="M44 35v-8c0-6 5-10 12-10s12 4 12 10v8" />
          <path d="M36 45v35" />
          <path d="M76 45v35" />
        </g>
      );
    case "rollers":
      return (
        <g>
          <path d="M33 22h33l13 33H47c-14 0-24-9-24-22V21" />
          <path d="M37 55h46l-5 18H24" />
          <path d="M31 73h42" />
          <circle cx="36" cy="84" r="5.5" />
          <circle cx="67" cy="84" r="5.5" />
          <path d="M68 27 43 52" />
          <path d="M45 27h16" />
        </g>
      );
  }
}

function ProhibitedIcon({ icon }: { icon: AttendanceRuleIcon }) {
  return (
    <svg
      aria-hidden="true"
      className="visit-rule-icon"
      focusable="false"
      viewBox="0 0 120 120"
    >
      <circle className="visit-rule-ring" cx="60" cy="60" r="53" />
      <g className="visit-rule-glyph">
        <RuleGlyph icon={icon} />
      </g>
      <path className="visit-rule-slash" d="M22 20 99 99" />
    </svg>
  );
}

export function VisitRules() {
  return (
    <section
      className="visit-rules"
      aria-labelledby="visit-rules-title"
      data-reveal
    >
      <div className="festival-shell">
        <header className="visit-rules-heading">
          <div className="visit-rules-topline" aria-hidden="true">
            <span />
            <svg focusable="false" viewBox="0 0 100 58">
              <path d="M51 2C63 18 61 34 50 48 39 33 39 18 51 2Z" />
              <path d="M16 22C34 23 45 32 48 49 29 48 18 39 16 22Z" />
              <path d="M84 22C66 23 55 32 52 49 71 48 82 39 84 22Z" />
            </svg>
            <span />
          </div>
          <h2 id="visit-rules-title">Правила посещения</h2>
          <p>Массового мероприятия</p>
          <div className="visit-rules-bottomline" aria-hidden="true" />
        </header>

        <ul className="visit-rules-list">
          {attendanceRules.map((rule) => (
            <li key={rule.icon}>
              <ProhibitedIcon icon={rule.icon} />
              <p>
                <strong>Нельзя</strong>
                <span>{rule.label}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
