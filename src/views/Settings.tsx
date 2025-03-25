import { useAccount } from "jazz-react";
import { Organization } from "../schema";
import { FC } from "react";
import "./Settings.css";

export const Settings = () => {
  return (
    <div className="settings">
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
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        "Are you sure you want to remove this organization from your list? You will need to be invited again by an administrator to rejoin."
      )
    ) {
      removeOrg(organization);
    }
  };
  return (
    <li>
      <span>{organization.name}</span>
      <span>
        <button onClick={handleRemoveClick}>Remove</button>
      </span>
    </li>
  );
};
