import Image from "next/image";
import { attendanceRules, type AttendanceRuleIcon } from "@/content/rules";

const visitRuleIconSrc: Record<AttendanceRuleIcon, string> = {
  knife: "/icons/visit-rules/sword.svg",
  firearm: "/icons/visit-rules/pistol.svg",
  aerosol: "/icons/visit-rules/spray.svg",
  flammable: "/icons/visit-rules/flame.svg",
  luggage: "/icons/visit-rules/luggage.svg",
  rollers: "/icons/visit-rules/roller-skating.svg",
};

function ProhibitedIcon({ icon }: { icon: AttendanceRuleIcon }) {
  return (
    <span aria-hidden="true" className="visit-rule-icon">
      <Image alt="" height={72} src={visitRuleIconSrc[icon]} width={72} />
    </span>
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
