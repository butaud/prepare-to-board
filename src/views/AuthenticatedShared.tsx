import { useLoadAccount } from "../hooks/Account";
import { useMeetingSummaries } from "../hooks/OrganizationData";

export const AuthenticatedShared = () => {
  const { me, outlet } = useLoadAccount();
  // Kept subscribed for the whole session (it's small) so pages that use it
  // get the cached result instantly instead of re-subscribing on navigation.
  useMeetingSummaries();
  if (me === undefined) {
    return <p>Loading...</p>;
  }
  if (me === null) {
    return <p>Account not found</p>;
  }
  return outlet;
};
