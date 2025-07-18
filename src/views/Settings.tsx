import { useAccount } from "jazz-tools/react";
import { Schema, Organization } from "../schema";
import { FC } from "react";
import "./Settings.css";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { SlBan } from "react-icons/sl";

export const Settings = () => {
  return (
    <div className="settings">
      <Breadcrumbs />
      <h3>User Profile</h3>
      <ManageProfile />
      <h3>Organizations</h3>
      <ManageOrganizations />
    </div>
  );
};

export const ManageProfile = () => {
  const { me } = useAccount(Schema.UserAccount, {
    resolve: {
      profile: true,
    },
  });
  if (!me) {
    return null;
  }

  return (
    <div className="profile">
      <div className="profile-field">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="firstName"
          value={me.profile.name}
          onChange={(e) => {
            me.profile.name = e.target.value;
          }}
        />
      </div>
    </div>
  );
};

export const ManageOrganizations = () => {
  const { me } = useAccount(Schema.UserAccount, {
    resolve: {
      root: {
        organizations: {
          $each: true,
        },
      },
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
        <button className="danger" onClick={handleRemoveClick}>
          <SlBan /> Remove
        </button>
      </span>
    </li>
  );
};
