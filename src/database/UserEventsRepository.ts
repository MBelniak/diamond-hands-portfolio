import { CashEvent, PortfolioData, type PortfolioEvent } from "@/lib/xlsx-parser/types";
import container from "@/iocContainer";
import { AbstractDatabaseClient } from "@/database/index";
import { Models, Query, Role } from "node-appwrite";
import { User } from "@clerk/nextjs/server";
import { STORAGE_FILE_ID, USER_FILES_TABLE, USER_ID_COLUMN } from "@/database/consts";
import { v4 } from "uuid";
import Row = Models.Row;

export class UserEventsRepository {
  static async saveEventsToDB(events: PortfolioData["portfolioEvents"], user: User) {
    const db = container.get(AbstractDatabaseClient);
    console.log("Storing portfolio in DB");

    const storage = db.getStorage();
    const result = await storage.createFile({
      bucketId: process.env.APPWRITE_BUCKET_ID!,
      fileId: v4(),
      file: new File([JSON.stringify(events)], "data.json", { type: "application/json" }),
    });

    const userId = user.id;
    const dbClient = db.getDBClient();
    await dbClient.createRow({
      databaseId: db.getDatabaseId(),
      tableId: USER_FILES_TABLE,
      rowId: v4(),
      data: {
        [USER_ID_COLUMN]: userId,
        [STORAGE_FILE_ID]: result.$id,
      },
    });
  }

  static async getEventsFromDB(user: User) {
    const db = container.get(AbstractDatabaseClient);
    const storage = db.getStorage();
    const dbClient = db.getDBClient();

    console.log("Fetching portfolio from DB");
    const rows = await dbClient.listRows<
      Row & {
        [USER_ID_COLUMN]: string;
        [STORAGE_FILE_ID]: string;
      }
    >({
      databaseId: db.getDatabaseId(),
      tableId: USER_FILES_TABLE,
      queries: [Query.equal(USER_ID_COLUMN, [user.id]), Query.orderDesc("$createdAt"), Query.limit(1)],
    });

    const newestRow = rows.rows.at(0);

    if (!newestRow) {
      return null;
    }

    const result = await storage.getFileView({
      bucketId: db.getBucketId(),
      fileId: newestRow[STORAGE_FILE_ID],
    });

    // convert result to JSON
    const nodeBuffer = Buffer.from(result);
    const str = nodeBuffer.toString("utf-8");
    return JSON.parse(str) as {
      cashEvents: CashEvent[];
      openPositions: PortfolioEvent[];
      closedStocksOpenEvents: PortfolioEvent[];
      closedStocksCloseEvents: PortfolioEvent[];
    };
  }
}
