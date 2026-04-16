// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
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
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<any>(null);

  const [signupMutation,  { loading: signupLoading,  error: signupError  }] = useMutation(SIGNUP_MUTATION);
  const [loginMutation,   { loading: loginLoading,   error: loginError   }] = useMutation(LOGIN_MUTATION);
  const [forgotMutation,  { loading: forgotLoading  }] = useMutation(FORGOT_PASSWORD_MUTATION);
  const [verifyMutation,  { loading: verifyLoading  }] = useMutation(VERIFY_OTP_MUTATION);
  const [resetMutation,   { loading: resetLoading   }] = useMutation(RESET_PASSWORD_MUTATION);

  const signup = async (input: {
    email: string; name: string; password: string;
    rollNumber: string; department?: string; year?: number;
  }) => {
    try {
      const { data } = await signupMutation({ variables: { input } });
      if (data?.signup?.needsVerification) {
        navigate("/verify-email", { state: { email: input.email } });
      }
      return data?.signup;
    } catch (err: any) { throw err; }
  };

  const login = async (input: { email: string; password: string }) => {
    try {
      const { data } = await loginMutation({ variables: { input } });
      if (data?.login?.token) {
        saveToken(data.login.token);
        navigate("/dashboard");
      }
      return data?.login?.user;
    } catch (err: any) { throw err; }
  };

  const logout = () => { clearToken(); navigate("/"); };

  const forgotPassword = async (email: string) => {
    try {
      const { data } = await forgotMutation({ variables: { email } });
      return data?.forgotPassword as boolean;
    } catch (err: any) { throw err; }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const { data } = await verifyMutation({ variables: { email, code } });
      return data?.verifyOtp as string;
    } catch (err: any) { throw err; }
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      const { data } = await resetMutation({ variables: { token: code, newPassword } });
      return data?.resetPassword as boolean;
    } catch (err: any) { throw err; }
  };

  return {
    signup, login, logout, forgotPassword, verifyOtp, resetPassword,
    loading: signupLoading || loginLoading || forgotLoading || verifyLoading || resetLoading,
    signupError,
    loginError,
    error,
  };
}