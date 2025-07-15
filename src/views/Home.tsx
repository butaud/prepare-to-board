import { useAccount } from "jazz-tools/react";
import { CreateOrganization } from "../ui/forms/Organization";
import { getUserProfileFormalName, Schema } from "../schema";

export const Home = () => {
  const { me } = useAccount(Schema.UserAccount, {
    resolve: {
      root: {
        selectedOrganization: true,
        organizations: {
          $each: true,
        },
      },
    },
  });

  if (!me) {
    return <h2>Loading...</h2>;
  }

  if (me.root?.organizations.length === 0) {
    return (
      <>
        <h2>Welcome to Prepare to Board!</h2>
        <p>
          You aren't a member of any organizations yet. If you are trying to
          join an existing organization, please contact the administrator of
          that organization to get an invitation.
        </p>
        <p>Or you may create a new organization to administrate:</p>
        <CreateOrganization />
      </>
    );
  }

  if (!me.root?.selectedOrganization) {
    return <h2>Please select one of your organizations at the top right.</h2>;
  }

  return (
    <div>
      <h2>Welcome, {getUserProfileFormalName(me.profile ?? undefined)}</h2>
      <p>
        This is your home page. You can view your calendar and action items
        here.
      </p>
    </div>
  );
};
