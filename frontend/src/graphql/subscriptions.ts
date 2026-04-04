import { gql } from "@apollo/client";

export const MESSAGE_SENT_SUBSCRIPTION = gql`
  subscription MessageSent($roomId: String!) {
    messageSent(roomId: $roomId) {
      id
      content
      createdAt
      roomId
      sender { id name }
    }
  }
`;

export const REQUEST_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription RequestStatusChanged($requestId: String!) {
    requestStatusChanged(requestId: $requestId) {
      id
      status
      amount
      reason
      acceptor { id name rollNumber }
      chatRoom { id }
    }
  }
`;