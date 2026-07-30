import { join } from "node:path";

const dataDirectory = join(/*turbopackIgnore: true*/ process.cwd(), "data");
const defaultDataFilePath = join(dataDirectory, "registrations.json");

export const getDataFilePath = () =>
  process.env.NODE_ENV === "test"
    ? process.env.FESTIVAL_DATA_FILE ?? defaultDataFilePath
    : defaultDataFilePath;

export const uploadDirectory = join(dataDirectory, "uploads");
