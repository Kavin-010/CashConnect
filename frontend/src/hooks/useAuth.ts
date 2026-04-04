import { useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import {
  LOGIN_MUTATION,
  SIGNUP_MUTATION,
  FORGOT_PASSWORD_MUTATION,
  VERIFY_OTP_MUTATION,
  RESET_PASSWORD_MUTATION,
} from "../graphql/mutations";
import { saveToken, clearToken } from "../lib/apolloClient";

export function useAuth() {
  const navigate = useNavigate();

  const [signupMutation, { loading: signupLoading, error: signupError }] =
    useMutation(SIGNUP_MUTATION);

  const signup = async (input: {
    email: string; name: string; password: string;
    rollNumber: string; department?: string; year?: number;
  }) => {
    const { data } = await signupMutation({ variables: { input } });
    if (data?.signup.token) { saveToken(data.signup.token); navigate("/dashboard"); }
    return data?.signup.user;
  };

  const [loginMutation, { loading: loginLoading, error: loginError }] =
    useMutation(LOGIN_MUTATION);

  const login = async (input: { email: string; password: string }) => {
    const { data } = await loginMutation({ variables: { input } });
    if (data?.login.token) { saveToken(data.login.token); navigate("/dashboard"); }
    return data?.login.user;
  };

  const logout = () => { clearToken(); navigate("/"); };

  const [forgotMutation, { loading: forgotLoading }] = useMutation(FORGOT_PASSWORD_MUTATION);
  const forgotPassword = async (email: string) => {
    const { data } = await forgotMutation({ variables: { email } });
    return data?.forgotPassword as boolean;
  };

  const [verifyMutation, { loading: verifyLoading }] = useMutation(VERIFY_OTP_MUTATION);
  const verifyOtp = async (email: string, code: string) => {
    const { data } = await verifyMutation({ variables: { email, code } });
    return data?.verifyOtp as string;
  };

  const [resetMutation, { loading: resetLoading }] = useMutation(RESET_PASSWORD_MUTATION);
  const resetPassword = async (token: string, newPassword: string) => {
    const { data } = await resetMutation({ variables: { token, newPassword } });
    return data?.resetPassword as boolean;
  };

  return {
    signup, login, logout, forgotPassword, verifyOtp, resetPassword,
    loading: signupLoading || loginLoading || forgotLoading || verifyLoading || resetLoading,
    signupError, loginError,
  };
}