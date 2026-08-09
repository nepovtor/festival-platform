import { attendanceRules, type AttendanceRuleIcon } from "@/content/rules";

function RuleGlyph({ icon }: { icon: AttendanceRuleIcon }) {
  switch (icon) {
    case "knife":
      return (
        <g>
          <path d="M43 72 76 39c7-7 13-16 15-25 1-4-3-6-6-3L28 68" />
          <path d="M27 72 14 85c-3 3-3 8 0 11s8 3 11 0l13-13" />
          <path d="m30 63 17 17" />
          <path d="M18 82 5 95" />
        </g>
      );
    case "firearm":
      return (
        <g>
          <path d="M18 39h50c8 0 14 6 14 14H31" />
          <path d="M68 39V29h13v10" />
          <path d="M31 53c0 11-6 16-13 21-5 4-4 12 3 13h17l8-34" />
          <path d="M82 45h10v8H81" />
          <path d="M48 53c0 8 5 14 13 14" />
          <path d="M48 53h13" />
          <circle cx="38" cy="54" r="4" />
        </g>
      );
    case "aerosol":
      return (
        <g>
          <path d="M39 38h24v56H39z" />
          <path d="M44 26h14v12H44z" />
          <path d="M41 26h20" />
          <path d="M44 52h14" />
          <path d="M44 80h14" />
          <circle cx="74" cy="28" r="2" />
          <circle cx="82" cy="24" r="2" />
          <circle cx="84" cy="34" r="2" />
          <circle cx="92" cy="29" r="2" />
          <circle cx="73" cy="38" r="2" />
          <circle cx="93" cy="40" r="2" />
        </g>
      );
    case "flammable":
      return (
        <g>
          <path d="M58 99c19-6 31-20 31-39 0-13-6-25-17-34 0 13-6 22-16 28 2-16-3-29-16-42 0 19-14 30-22 45-10 19 1 37 21 42" />
          <path d="M51 99c11-4 18-13 18-24 0-8-4-16-11-22 0 9-5 15-12 19 1-10-2-18-10-26 0 12-9 19-14 29-6 11 0 21 12 24" />
        </g>
      );
    case "luggage":
      return (
        <g>
          <rect x="24" y="34" width="64" height="57" rx="8" />
          <path d="M44 34v-8c0-6 5-10 12-10s12 4 12 10v8" />
          <path d="M36 45v35" />
          <path d="M76 45v35" />
        </g>
      );
    case "rollers":
      return (
        <g>
          <path d="M33 22h34l13 34H46c-14 0-24-9-24-22V20" />
          <path d="M37 56h47l-5 18H24" />
          <path d="M31 74h42" />
          <circle cx="36" cy="84" r="6" />
          <circle cx="67" cy="84" r="6" />
          <path d="M69 27 43 52" />
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
