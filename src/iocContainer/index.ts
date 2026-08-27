import { Container } from "inversify";
import { AbstractDatabaseClient, DatabaseClient } from "@/database";
import { AbstractRedisClient, RedisClient } from "@/lib/redis";

const iocContainer = new Container();

// server side
if (typeof window === "undefined") {
  iocContainer.bind<AbstractDatabaseClient>(AbstractDatabaseClient).to(DatabaseClient);
  iocContainer.bind<AbstractRedisClient>(AbstractRedisClient).to(RedisClient);
}

export default iocContainer;
