import { festival as defaultFestival } from "./festival";
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

export type SiteContent = {
  festival: FestivalContent;
  program: ProgramContentItem[];
};

export const defaultSiteContent: SiteContent = {
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
};
