import { useAcceptInvite } from "jazz-react";
import { useNavigate } from "react-router-dom";
import { Organization, UserAccount } from "../schema";
import { ID } from "jazz-tools";

export const Invite = () => {
  const navigate = useNavigate();

  useAcceptInvite({
    invitedObjectSchema: Organization,
    onAccept: async (organizationId: ID<Organization>) => {
      const me = await UserAccount.getMe().ensureLoaded({
        root: {
          organizations: [{}],
        },
      });

      const organization = await Organization.load(organizationId, {});

      if (!organization) {
        console.error("Organization not found");
        return;
      }

      me.root.selectedOrganization = organization;

      if (me.root.organizations.some((org) => org?.id === organizationId)) {
        console.log("Already a member of this organization");
      } else {
        me.root.organizations.push(organization);
      }

      navigate("/");
    },
  });
  return (
    <>
      <p>Accepting the invite...</p>
    </>
  );
};
