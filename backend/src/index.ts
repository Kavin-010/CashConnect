import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import { expressMiddleware } from "@apollo/server/express4";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { ApolloServer } from "@apollo/server";
import { makeExecutableSchema } from "@graphql-tools/schema";

import { typeDefs } from "./graphql/typeDefs";
import { resolvers } from "./graphql/resolvers";
import { rateLimiter } from "./middleware/rateLimiter";
import { getUser } from "./middleware/auth";
import { prisma } from "./prisma/client";
import { pubsub } from "./graphql/pubsub";

const PORT = process.env.PORT ?? 4000;

async function bootstrap() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173", credentials: true }));
  app.use(express.json());
  app.use(rateLimiter);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const apolloServer = new ApolloServer({ schema });
  await apolloServer.start();

  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const user = await getUser(req.headers.authorization ?? "");
        return { user, prisma, pubsub };
      },
    })
  );

  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
  useServer(
    {
      schema,
      context: async (ctx) => {
        const token = (ctx.connectionParams?.authorization as string) ?? "";
        const user = await getUser(token);
        return { user, prisma, pubsub };
      },
    },
    wsServer
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", ts: new Date().toISOString() });
  });

  httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP  → http://localhost:${PORT}/graphql`);
    console.log(`🔌 WS    → ws://localhost:${PORT}/graphql`);
  });

  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});