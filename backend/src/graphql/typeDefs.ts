export const typeDefs = `#graphql

  scalar DateTime

  type User {
    id:         String!
    email:      String!
    name:       String!
    rollNumber: String!
    department: String
    year:       Int
    isVerified: Boolean!
    createdAt:  DateTime!
  }

  type AuthPayload {
    token: String!
    user:  User!
  }

  enum RequestStatus {
    OPEN
    ACCEPTED
    COMPLETED
    CANCELLED
    EXPIRED
  }

  type CashRequest {
    id:        String!
    amount:    Float!
    reason:    String!
    status:    RequestStatus!
    expiresAt: DateTime
    createdAt: DateTime!
    requester: User!
    acceptor:  User
    chatRoom:  ChatRoom
  }

  type ChatRoom {
    id:       String!
    request:  CashRequest!
    messages: [Message!]!
  }

  type Message {
    id:        String!
    content:   String!
    createdAt: DateTime!
    sender:    User!
    roomId:    String!
  }

  input SignupInput {
    email:      String!
    name:       String!
    password:   String!
    rollNumber: String!
    department: String
    year:       Int
  }

  input LoginInput {
    email:    String!
    password: String!
  }

  input PostRequestInput {
    amount:           Float!
    reason:           String!
    expiresInMinutes: Int    # ← NEW: how many minutes until request expires
  }

  input SendMessageInput {
    roomId:  String!
    content: String!
  }

  type Query {
    me:           User!
    openRequests: [CashRequest!]!
    request(id: String!): CashRequest
    chatRoom(requestId: String!): ChatRoom
    messages(roomId: String!): [Message!]!
    myRequests: [CashRequest!]!    # ← NEW: requester sees their own requests
  }

  type Mutation {
    signup(input: SignupInput!):  AuthPayload!
    login(input: LoginInput!):   AuthPayload!

    forgotPassword(email: String!):                      Boolean!
    verifyOtp(email: String!, code: String!):            String!
    resetPassword(token: String!, newPassword: String!): Boolean!

    postRequest(input: PostRequestInput!):  CashRequest!
    acceptRequest(requestId: String!):      CashRequest!
    completeRequest(requestId: String!):    CashRequest!  # ← requester marks done
    cancelRequest(requestId: String!):      CashRequest!

    sendMessage(input: SendMessageInput!):  Message!
  }

  type Subscription {
    messageSent(roomId: String!):             Message!
    requestStatusChanged(requestId: String!): CashRequest!
  }
`;