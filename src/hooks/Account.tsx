import { Outlet } from "react-router-dom";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../convexClient";
import { Organization, OrganizationSummary, UserAccount, UserProfile } from "../schema";

type ServerAccount = {
  id: string;
  profile: UserProfile;
  organizations: OrganizationSummary[];
  selectedOrganizationId?: string;
} | null;

const hydrateAccount = (
  serverAccount: NonNullable<ServerAccount>,
  selectedOrganization: Organization | undefined
): UserAccount => {
  const { organizations } = serverAccount;
  const roleFor = (entity?: { organizationId?: string; id?: string } | null) => {
    const organizationId =
      entity?.organizationId ?? entity?.id ?? serverAccount.selectedOrganizationId;
    return organizations.find((candidate) => candidate.id === organizationId)?.role;
  };

  return {
    id: serverAccount.id,
    profile: serverAccount.profile,
    root: { organizations, selectedOrganization },
    canWrite: (entity?: { organizationId?: string; id?: string } | null) => {
      const role = roleFor(entity);
      return role === "admin" || role === "writer";
    },
    canAdmin: (entity?: { organizationId?: string; id?: string } | null) =>
      roleFor(entity) === "admin",
  };
};

export type LoadedAccount = UserAccount;

export const LoadedAccountContext = createContext<LoadedAccount | undefined>(
  undefined
);

const useShouldLoadAccount = () => {
  const { isLoaded, isSignedIn } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  return isLoaded && isSignedIn === true && !isLoading && isAuthenticated;
};

// Call once, near the root. useLoadAccount is used by several components at
// once, so running this effect there sent the same mutation several times
// on every page load.
export const useEnsureCurrentUser = () => {
  const { user } = useUser();
  const shouldLoadAccount = useShouldLoadAccount();
  const ensureCurrentUser = useMutation(api.app.ensureCurrentUser);

  useEffect(() => {
    if (!shouldLoadAccount) return;
    const email = user?.primaryEmailAddress?.emailAddress;
    void ensureCurrentUser({
      name: user?.fullName ?? email,
      email,
    });
  }, [ensureCurrentUser, shouldLoadAccount, user?.fullName, user?.primaryEmailAddress?.emailAddress]);
};

// Both queries are subscribed at once (neither needs the other's result),
// and the account only counts as loaded when both have arrived.
export const useLoadAccount = () => {
  const shouldLoadAccount = useShouldLoadAccount();
  const serverAccount = useQuery(
    api.app.account,
    shouldLoadAccount ? {} : "skip"
  ) as ServerAccount | undefined;
  const serverOrganization = useQuery(
    api.app.selectedOrganization,
    shouldLoadAccount ? {} : "skip"
  ) as Organization | null | undefined;

  const isLoading =
    shouldLoadAccount && (serverAccount === undefined || serverOrganization === undefined);

  const me = useMemo(() => {
    if (!serverAccount) return null;
    // Both queries resolve the selection the same way on the server; only
    // use the organization details once they match the account's selection.
    const selectedOrganization =
      serverOrganization && serverOrganization.id === serverAccount.selectedOrganizationId
        ? serverOrganization
        : undefined;
    return hydrateAccount(serverAccount, selectedOrganization);
  }, [serverAccount, serverOrganization]);

  return {
    me: isLoading ? undefined : me ?? undefined,
    outlet: !isLoading && me && (
      <LoadedAccountContext.Provider value={me}>
        <Outlet />
      </LoadedAccountContext.Provider>
    ),
  };
};

export const useLoadedAccount = () => {
  const account = useContext(LoadedAccountContext);
  if (account === undefined) {
    throw new Error(
      "useLoadedAccount must be used within a LoadedAccountContext provider"
    );
  }
  return account;
};

export type { Organization };
