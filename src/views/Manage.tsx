import { useAccount } from "jazz-react";
import { EditOrganization } from "../ui/forms/Organization";

export const Manage = () => {
  const { me } = useAccount({
    root: {
      selectedOrganization: {},
    },
  });

  if (!me) {
    return null;
  }

  if (!me.root.selectedOrganization) {
    return (
      <h2>
        Please select an organization to manage from the dropdown at the top
        right.
      </h2>
    );
  }

  return (
    <>
      <h3>Organization Details</h3>
      <EditOrganization id={me.root.selectedOrganization.id} />
      <h3>Organization Members</h3>
    </>
  );
};
