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
    if (!process.env.APPWRITE_PROJECT_ID) {
      throw new Error("No APPWRITE_PROJECT_ID env variable found. Cannot initialize database client.");
    }
    if (!process.env.APPWRITE_API_KEY) {
      throw new Error("Cannot find env variable APPWRITE_API_KEY. Database connection failed.");
    }
    if (!process.env.APPWRITE_ENDPOINT) {
      throw new Error("Cannot find env variable APPWRITE_ENDPOINT. Database connection failed.");
    }
    if (!process.env.APPWRITE_DATABASE_ID) {
      throw new Error("Cannot find env variable APPWRITE_DATABASE_ID. Database connection failed.");
    }
    if (!process.env.APPWRITE_BUCKET_ID) {
      throw new Error("Cannot find env variable APPWRITE_BUCKET_ID. Database connection failed.");
    }

    client
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY)
      .setSelfSigned(true);

    this.tablesDB = new TablesDB(client);
    this.storage = new Storage(client);
    this.databaseId = process.env.APPWRITE_DATABASE_ID;
    this.bucketId = process.env.APPWRITE_BUCKET_ID;
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

export default DatabaseClient;
