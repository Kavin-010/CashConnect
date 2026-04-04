import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

const GRAPHQL_HTTP = import.meta.env.VITE_API_URL ?? "http://localhost:4000/graphql";
const GRAPHQL_WS   = import.meta.env.VITE_WS_URL  ?? "ws://localhost:4000/graphql";

const httpLink = createHttpLink({ uri: GRAPHQL_HTTP });

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("cc_token");
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS,
    connectionParams: () => {
      const token = localStorage.getItem("cc_token");
      return token ? { authorization: `Bearer ${token}` } : {};
    },
  })
);

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === "OperationDefinition" && def.operation === "subscription";
  },
  wsLink,
  authLink.concat(httpLink)
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "network-only" },
  },
});

export const TOKEN_KEY  = "cc_token";
export const saveToken  = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const getToken   = (): string | null => localStorage.getItem(TOKEN_KEY);