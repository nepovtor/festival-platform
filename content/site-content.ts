import { festival as defaultFestival } from "./festival";
import { gallery as defaultGallery } from "./gallery";
import { program as defaultProgram } from "./program";

export type FestivalFeature = {
  title: string;
  description: string;
};

export type FestivalContent = {
  name: string;
  date: string;
  time: string;
  place: string;
  address: string;
  description: string;
  about: string;
  features: FestivalFeature[];
};

export type ProgramContentItem = {
  time: string;
  title: string;
  description: string;
  venue: string;
  category: string;
};

export type GalleryImage = {
  src: string;
  alt: string;
  className: string;
  position: string;
};

export type RegistrationEmailContent = {
  subject: string;
  heading: string;
  intro: string;
  closing: string;
  calendarButtonLabel: string;
};

export type SiteContent = {
  version: number;
  festival: FestivalContent;
  program: ProgramContentItem[];
  registrationEmail: RegistrationEmailContent;
  heroImage: string;
  programImage: string;
  gallery: GalleryImage[];
};

export const legacyRegistrationEmailV4: RegistrationEmailContent = {
  subject: "Спасибо за регистрацию на грибной фестиваль Lay’s!",
  heading: "Спасибо за регистрацию!",
  intro: "Ждём вас на главном грибном событии этого лета.",
  closing: "До встречи на грибном фестивале Lay’s!",
  calendarButtonLabel: "Добавить в календарь",
};

export function migrateRegistrationEmailV4(
  value: RegistrationEmailContent,
): RegistrationEmailContent {
  const migrated = { ...value };
  for (const key of Object.keys(
    legacyRegistrationEmailV4,
  ) as Array<keyof RegistrationEmailContent>) {
    if (migrated[key] === legacyRegistrationEmailV4[key]) {
      migrated[key] = defaultSiteContent.registrationEmail[key];
    }
  }
  return migrated;
}

export const defaultSiteContent: SiteContent = {
  version: 6,
  festival: {
    name: defaultFestival.name,
    date: defaultFestival.date,
    time: defaultFestival.time,
    place: defaultFestival.place,
    address: defaultFestival.address,
    description: defaultFestival.description,
    about: defaultFestival.about,
    features: defaultFestival.features.map((feature) => ({ ...feature })),
  },
  program: defaultProgram.map((item) => ({ ...item })),
  registrationEmail: {
    subject: "Твой билет на тот самый «Грибной фестиваль Lay’s» 🍄",
    heading: "Здравствуйте!",
    intro:
      "Регистрация прошла успешно. 16 августа встречаемся на «Грибном фестивале Lay’s»!\n\nТот самый вкус уже совсем рядом, а вместе с ним музыка, развлечения, мастер-классы, подарки и много грибного настроения.",
    closing:
      "До встречи на самом грибном событии этого лета!\nКоманда «Грибного фестиваля Lay’s»",
    calendarButtonLabel: "Добавить в календарь",
  },
  heroImage: "/images/lays-mushroom-pack.webp",
  programImage: "/images/dinamo-stadium.webp",
  gallery: defaultGallery.map((item) => ({ ...item })),
};
