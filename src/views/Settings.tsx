import { Organization } from "../schema";
import { FC, useState } from "react";
import "./Settings.css";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { SlBan, SlPlus } from "react-icons/sl";
import { useLoadedAccount } from "../hooks/Account";
import { CreateOrganization } from "../ui/forms/Organization";

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
  const me = useLoadedAccount();

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
  const me = useLoadedAccount();
  const [isCreatingOrganization, setCreatingOrganization] = useState(false);

  const removeOrg = (organization: Organization) => {
    const index = me.root.organizations.findIndex(
      (org) => org.id === organization.id
    );
    if (index !== -1) {
      me.root.organizations.splice(index, 1);
    }
  };

  return (
    <>
      <ul>
        {me.root.organizations.map((organization) => (
          <OrganizationNode
            key={organization.id}
            organization={organization}
            removeOrg={removeOrg}
          />
        ))}
        {!isCreatingOrganization && (
          <li>
            <button onClick={() => setCreatingOrganization(true)}>
              <SlPlus /> Create Organization
            </button>
          </li>
        )}
      </ul>
      {isCreatingOrganization && (
        <CreateOrganization
          onDoneCreating={() => setCreatingOrganization(false)}
        />
      )}
    </>
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
