import { useEffect } from "react";
import { useMutation } from "convex/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../convexClient";

export const Invite = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const joinOrganization = useMutation(api.app.joinOrganization);
  const organizationId = params.get("org");

  useEffect(() => {
    if (!organizationId) return;
    void joinOrganization({ organizationId }).then(() => navigate("/"));
  }, [joinOrganization, navigate, organizationId]);

  if (!organizationId) {
    return <p>Invite link is missing an organization.</p>;
  }

  return <p>Accepting the invite...</p>;
};
