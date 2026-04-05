import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      rollNumber
      department
      year
    }
  }
`;

export const OPEN_REQUESTS_QUERY = gql`
  query OpenRequests {
    openRequests {
      id
      amount
      reason
      location
      status
      expiresAt
      createdAt
      requester {
        id
        name
        rollNumber
        department
      }
    }
  }
`;

export const MY_REQUESTS_QUERY = gql`
  query MyRequests {
    myRequests {
      id
      amount
      reason
      status
      location
      expiresAt
      createdAt
      acceptor {
        id
        name
        rollNumber
      }
      chatRoom {
        id
      }
    }
  }
`;

export const CHAT_ROOM_QUERY = gql`
  query ChatRoom($requestId: String!) {
    chatRoom(requestId: $requestId) {
      id
      request {
        id
        amount
        reason
        requester { id name }
        acceptor  { id name }
      }
      messages {
        id
        content
        createdAt
        roomId
        sender { id name }
      }
    }
  }
`;