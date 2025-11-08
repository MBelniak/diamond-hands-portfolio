import { Client, TablesDB } from "node-appwrite";
import container from "../iocContainer";
import { AbstractDatabaseClient } from "@/database/index";
import { STORAGE_FILE_ID, USER_FILES_TABLE, USER_FILES_TABLE_NAME, USER_ID_COLUMN } from "@/database/consts";

export const client = new Client();

export const initDatabase = async (appwriteDbId: string) => {
  const db = container.get(AbstractDatabaseClient);
  if (!(await isCollectionsInitialized(db.getDBClient(), appwriteDbId))) {
    await initializeCollections(db.getDBClient(), appwriteDbId);
  }
};

const isCollectionsInitialized = async (client: TablesDB, databaseId: string): Promise<boolean> => {
  try {
    await client.getTable({ databaseId, tableId: USER_FILES_TABLE });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

const initializeCollections = async (client: TablesDB, databaseId: string) => {
  const database = await client.get({ databaseId });
  const userFilesCollection = await client.createTable({
    databaseId: database.$id,
    tableId: USER_FILES_TABLE,
    name: USER_FILES_TABLE_NAME,
  });

  await client.createStringColumn({
    databaseId: database.$id,
    tableId: userFilesCollection.$id,
    key: USER_ID_COLUMN,
    size: 255,
    required: true,
  });

  await client.createStringColumn({
    databaseId: database.$id,
    tableId: userFilesCollection.$id,
    key: STORAGE_FILE_ID,
    size: 255,
    required: true,
  });
};
