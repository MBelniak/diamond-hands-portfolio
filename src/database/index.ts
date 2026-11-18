import { injectable } from "inversify";

import { TablesDB, Storage } from "node-appwrite";
import { client } from "@/database/appwrite";

export abstract class AbstractDatabaseClient {
  abstract getDBClient(): TablesDB;
  abstract getStorage(): Storage;
  abstract getDatabaseId(): string;
  abstract getBucketId(): string;
}
@injectable()
export class DatabaseClient implements AbstractDatabaseClient {
  private tablesDB: TablesDB;
  private storage: Storage;
  private databaseId: string;
  private bucketId: string;

  constructor() {
    const env = (name: string) => {
      const value = process.env[name];
      if (!value) throw new Error(`Cannot find env variable ${name}. Database connection failed.`);
      return value;
    };

    client
      .setEndpoint(env("APPWRITE_ENDPOINT"))
      .setProject(env("APPWRITE_PROJECT_ID"))
      .setKey(env("APPWRITE_API_KEY"))
      .setSelfSigned(true);

    this.tablesDB = new TablesDB(client);
    this.storage = new Storage(client);
    this.databaseId = env("APPWRITE_DATABASE_ID");
    this.bucketId = env("APPWRITE_BUCKET_ID");
  }

  getDBClient(): TablesDB {
    return this.tablesDB;
  }

  getStorage(): Storage {
    return this.storage;
  }

  getDatabaseId(): string {
    return this.databaseId;
  }

  getBucketId(): string {
    return this.bucketId;
  }
}
