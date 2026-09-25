import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../convexClient";
import { useState } from "react";

export const Invite = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const joinOrganization = useMutation(api.app.joinOrganization);
  const [error, setError] = useState<string>();
  const organizationId = params.get("org");

  useEffect(() => {
    if (!organizationId || isLoading || !isAuthenticated) return;
    void joinOrganization({ organizationId })
      .then(() => navigate("/"))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [isAuthenticated, isLoading, joinOrganization, navigate, organizationId]);

  if (!organizationId) {
    return <p>Invite link is missing an organization.</p>;
  }

  if (error) {
    return <p>Unable to accept invite: {error}</p>;
  }

  return <p>Accepting the invite...</p>;
};
