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

  type SignupPayload {
    needsVerification: Boolean!
    email:             String!
    token:             String
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
    location:  String
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

  type Rating {
    id:        String!
    stars:     Int!
    comment:   String
    createdAt: DateTime!
    rater:     User!
    rated:     User!
    requestId: String!
  }

  type UserRatings {
    ratings: [Rating!]!
    average: Float!
    total:   Int!
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

  input UpdateProfileInput {
    name:       String
    department: String
    year:       Int
  }

  input PostRequestInput {
    amount:           Float!
    reason:           String!
    location:         String
    expiresInMinutes: Int
  }

  input SendMessageInput {
    roomId:  String!
    content: String!
  }

  input SubmitRatingInput {
    requestId: String!
    stars:     Int!
    comment:   String
  }

  type Query {
    me:           User!
    openRequests: [CashRequest!]!
    myRequests:   [CashRequest!]!
    request(id: String!):           CashRequest
    chatRoom(requestId: String!):   ChatRoom
    messages(roomId: String!):      [Message!]!
    userRatings(userId: String!):   UserRatings!
    myRatingForRequest(requestId: String!): Rating
  }

  type Mutation {
    # Auth
    signup(input: SignupInput!):                          SignupPayload!
    verifyEmail(email: String!, code: String!):           AuthPayload!
    resendVerification(email: String!):                   Boolean!
    login(input: LoginInput!):                            AuthPayload!

    # Password reset
    forgotPassword(email: String!):                       Boolean!
    verifyOtp(email: String!, code: String!):             String!
    resetPassword(token: String!, newPassword: String!):  Boolean!

    # Profile
    updateProfile(input: UpdateProfileInput!):            User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!

    # Requests
    postRequest(input: PostRequestInput!):    CashRequest!
    acceptRequest(requestId: String!):        CashRequest!
    completeRequest(requestId: String!):      CashRequest!
    cancelRequest(requestId: String!):        CashRequest!

    # Chat
    sendMessage(input: SendMessageInput!):    Message!

    # Ratings
    submitRating(input: SubmitRatingInput!):  Rating!
  }

  type Subscription {
    messageSent(roomId: String!):             Message!
    requestStatusChanged(requestId: String!): CashRequest!
  }
`;