// @ts-nocheck
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { OPEN_REQUESTS_QUERY } from "../graphql/queries";
import { POST_REQUEST_MUTATION, ACCEPT_REQUEST_MUTATION } from "../graphql/mutations";

export function useRequests() {
  const navigate = useNavigate();

  const { data, loading: fetchLoading, error, refetch } = useQuery(
    OPEN_REQUESTS_QUERY,
    { fetchPolicy: "network-only" }
  );

  const [postMutation, { loading: postLoading }] = useMutation(POST_REQUEST_MUTATION, {
    refetchQueries: [{ query: OPEN_REQUESTS_QUERY }],
  });
  const postRequest = async (input: { amount: number; reason: string }) => {
    const { data } = await postMutation({ variables: { input } });
    return data?.postRequest;
  };

  const [acceptMutation, { loading: acceptLoading }] = useMutation(ACCEPT_REQUEST_MUTATION, {
    refetchQueries: [{ query: OPEN_REQUESTS_QUERY }],
  });
  const acceptRequest = async (requestId: string) => {
    const { data } = await acceptMutation({ variables: { requestId } });
    // ← Fixed: always navigate after accept using the requestId we already have
    if (data?.acceptRequest) {
      navigate(`/chat/${requestId}`);
    }
    return data?.acceptRequest;
  };

  return {
    requests: data?.openRequests ?? [],
    postRequest,
    acceptRequest,
    refetch,
    loading: fetchLoading || postLoading || acceptLoading,
    error,
  };
}