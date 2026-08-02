import { join } from "node:path";

const dataDirectory = join(/*turbopackIgnore: true*/ process.cwd(), "data");
const defaultDataFilePath = join(dataDirectory, "registrations.json");
const defaultDatabaseFilePath = join(dataDirectory, "festival.sqlite");

export const getDataFilePath = () =>
  process.env.FESTIVAL_DATA_FILE ?? defaultDataFilePath;

export const getDatabaseFilePath = () =>
  process.env.FESTIVAL_DB_FILE ?? defaultDatabaseFilePath;

export const uploadDirectory = join(dataDirectory, "uploads");
