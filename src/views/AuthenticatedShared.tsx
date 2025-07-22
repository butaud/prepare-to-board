import { useLoadAccount } from "../hooks/Account";

export const AuthenticatedShared = () => {
  const { me, outlet } = useLoadAccount();
  if (me === undefined) {
    return <p>Loading...</p>;
  }
  if (me === null) {
    return <p>Account not found</p>;
  }
  return outlet;
};
