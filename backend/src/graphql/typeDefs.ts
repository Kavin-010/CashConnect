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
    location:  String        # ← NEW
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
    location:         String   # ← NEW
    expiresInMinutes: Int
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

  input UpdateProfileInput {
  name:       String
  department: String
  year:       Int
  }
  
  type Mutation {
    signup(input: SignupInput!):  AuthPayload!
    login(input: LoginInput!):   AuthPayload!

    forgotPassword(email: String!):                      Boolean!
    verifyOtp(email: String!, code: String!):            String!
    resetPassword(token: String!, newPassword: String!): Boolean!
    updateProfile(input: UpdateProfileInput!): User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!

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