import { gql } from "@apollo/client";

export const SIGNUP_MUTATION = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      needsVerification
      email
    }
  }
`;

export const VERIFY_EMAIL_MUTATION = gql`
  mutation VerifyEmail($email: String!, $code: String!) {
    verifyEmail(email: $email, code: $code) {
      token
      user { id email name rollNumber }
    }
  }
`;

export const RESEND_VERIFICATION_MUTATION = gql`
  mutation ResendVerification($email: String!) {
    resendVerification(email: $email)
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { id email name rollNumber }
    }
  }
`;

export const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

export const VERIFY_OTP_MUTATION = gql`
  mutation VerifyOtp($email: String!, $code: String!) {
    verifyOtp(email: $email, code: $code)
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword)
  }
`;

export const POST_REQUEST_MUTATION = gql`
  mutation PostRequest($input: PostRequestInput!) {
    postRequest(input: $input) {
      id
      amount
      reason
      location
      status
      expiresAt
      createdAt
      requester { id name rollNumber }
    }
  }
`;

export const ACCEPT_REQUEST_MUTATION = gql`
  mutation AcceptRequest($requestId: String!) {
    acceptRequest(requestId: $requestId) {
      id
      status
      acceptor { id name }
      chatRoom { id }
    }
  }
`;

export const COMPLETE_REQUEST_MUTATION = gql`
  mutation CompleteRequest($requestId: String!) {
    completeRequest(requestId: $requestId) {
      id
      status
    }
  }
`;

export const CANCEL_REQUEST_MUTATION = gql`
  mutation CancelRequest($requestId: String!) {
    cancelRequest(requestId: $requestId) {
      id
      status
    }
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      content
      createdAt
      roomId
      sender { id name }
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      email
      rollNumber
      department
      year
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

export const SUBMIT_RATING_MUTATION = gql`
  mutation SubmitRating($input: SubmitRatingInput!) {
    submitRating(input: $input) {
      id
      stars
      comment
      rater { id name }
      rated { id name }
    }
  }
`;