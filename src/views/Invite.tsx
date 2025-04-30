import { useAcceptInvite } from "jazz-react";
import { useNavigate } from "react-router-dom";
import { Organization, UserAccount } from "../schema";
import { ID } from "jazz-tools";

export const Invite = () => {
  const navigate = useNavigate();

  useAcceptInvite({
    invitedObjectSchema: Organization,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onAccept: async (organizationId: ID<Organization>) => {
      const me = await UserAccount.getMe().ensureLoaded({
        resolve: {
          root: {
            organizations: {
              $each: true,
            },
          },
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

      await navigate("/");
    },
  });
  return (
    <>
      <p>Accepting the invite...</p>
    </>
  );
};
