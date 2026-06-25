import { Outlet } from "react-router-dom";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../convexClient";
import { Meeting, Organization, UserAccount } from "../schema";

type ServerAccount = Omit<UserAccount, "canWrite" | "canAdmin"> | null;

const toDateMeeting = (meeting: Meeting & { date: number; liveStartTime?: number }): Meeting => ({
  ...meeting,
  date: new Date(meeting.date),
  liveStartTime: meeting.liveStartTime ? new Date(meeting.liveStartTime) : undefined,
});

const hydrateAccount = (serverAccount: ServerAccount): UserAccount | null => {
  if (!serverAccount) return null;
  const organizations = serverAccount.root.organizations.map((org) => ({
    ...org,
    meetings: org.meetings.map((meeting) => toDateMeeting(meeting as Meeting & { date: number; liveStartTime?: number })),
  }));
  const selectedOrganization =
    organizations.find(
      (org) => org.id === serverAccount.root.selectedOrganization?.id
    ) ?? organizations[0];

  const roleFor = (entity?: { organizationId?: string; id?: string } | null) => {
    const organizationId = entity?.organizationId ?? entity?.id ?? selectedOrganization?.id;
    const org = organizations.find((candidate) => candidate.id === organizationId);
    return org?.memberships.find((member) => member.userId === serverAccount.id)?.role;
  };

  return {
    ...serverAccount,
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

export const useLoadAccount = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureCurrentUser = useMutation(api.app.ensureCurrentUser);
  const shouldLoadAccount =
    isLoaded && isSignedIn === true && !isLoading && isAuthenticated;
  const serverAccount = useQuery(
    api.app.me,
    shouldLoadAccount ? {} : "skip"
  ) as ServerAccount | undefined;

  useEffect(() => {
    if (!shouldLoadAccount) return;
    const email = user?.primaryEmailAddress?.emailAddress;
    void ensureCurrentUser({
      name: user?.fullName ?? email,
      email,
    });
  }, [ensureCurrentUser, shouldLoadAccount, user?.fullName, user?.primaryEmailAddress?.emailAddress]);

  const me = useMemo(() => hydrateAccount(serverAccount ?? null), [serverAccount]);

  return {
    me: serverAccount === undefined && shouldLoadAccount ? undefined : me ?? undefined,
    outlet: me && (
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
