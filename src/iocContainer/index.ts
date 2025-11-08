import { Container } from "inversify";
import { AbstractDatabaseClient, DatabaseClient } from "@/database";

const container = new Container();

// server side
if (typeof window === "undefined") {
  container.bind<AbstractDatabaseClient>(AbstractDatabaseClient).to(DatabaseClient);
}

export default container;
