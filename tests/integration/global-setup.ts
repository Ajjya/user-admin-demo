import { MongoMemoryServer } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

// One real mongod for the whole integration run; each test file uses its own database.
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const mongo = await MongoMemoryServer.create();
  project.provide("mongoUri", mongo.getUri());
  return async () => {
    await mongo.stop();
  };
}
