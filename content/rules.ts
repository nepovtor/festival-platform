export type AttendanceRuleIcon =
  | "knife"
  | "firearm"
  | "aerosol"
  | "flammable"
  | "luggage"
  | "rollers";

export type AttendanceRule = {
  icon: AttendanceRuleIcon;
  label: string;
};

export const attendanceRules: AttendanceRule[] = [
  { icon: "knife", label: "Холодное оружие" },
  { icon: "firearm", label: "Огнестрельное оружие" },
  { icon: "aerosol", label: "Распылять аэрозоли" },
  { icon: "flammable", label: "Легковоспламеняющиеся вещества" },
  { icon: "luggage", label: "Крупногабаритные сумки и рюкзаки" },
  { icon: "rollers", label: "Роликовые коньки" },
];
