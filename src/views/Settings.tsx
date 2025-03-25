import { useAccount } from "jazz-react";
import { Organization } from "../schema";
import { FC } from "react";

export const Settings = () => {
  return (
    <div>
      <h3>Organizations</h3>
      <ManageOrganizations />
    </div>
  );
};

export const ManageOrganizations = () => {
  const { me } = useAccount({
    root: {
      organizations: [{}],
    },
  });
  if (!me) {
    return null;
  }

  const removeOrg = (organization: Organization) => {
    const index = me.root.organizations.findIndex(
      (org) => org.id === organization.id
    );
    if (index !== -1) {
      me.root.organizations.splice(index, 1);
    }
  };

  return (
    <ul>
      {me.root.organizations.map((organization) => (
        <OrganizationNode
          key={organization.id}
          organization={organization}
          removeOrg={removeOrg}
        />
      ))}
    </ul>
  );
};

const OrganizationNode: FC<{
  removeOrg: (organization: Organization) => void;
  organization: Organization;
}> = ({ removeOrg, organization }) => {
  return (
    <li>
      <span>{organization.name}</span>
      <span>
        <button onClick={() => removeOrg(organization)}>Remove</button>
      </span>
    </li>
  );
};
