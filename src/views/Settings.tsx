import { Organization } from "../schema";
import { FC, useState } from "react";
import "./Settings.css";
import { SlBan, SlPlus } from "react-icons/sl";
import { useMutation } from "convex/react";
import { useLoadedAccount } from "../hooks/Account";
import { CreateOrganization } from "../ui/forms/Organization";
import { SubHeader } from "../ui/SubHeader";
import { ConfirmDialog } from "../ui/dialogs/ConfirmDialog";
import { api } from "../convexClient";

export const Settings = () => {
  return (
    <div className="settings">
      <SubHeader />
      <h3>User Profile</h3>
      <ManageProfile />
      <h3>Organizations</h3>
      <ManageOrganizations />
    </div>
  );
};

export const ManageProfile = () => {
  const me = useLoadedAccount();
  const updateProfile = useMutation(api.app.updateProfile);
  const [name, setName] = useState(me.profile.name);

  return (
    <form
      className="profile"
      onSubmit={(e) => {
        e.preventDefault();
        void updateProfile({ name });
      }}
    >
      <div className="profile-field">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <button type="submit" disabled={name.trim() === ""}>
        Save
      </button>
    </form>
  );
};

export const ManageOrganizations = () => {
  const me = useLoadedAccount();
  const leaveOrganization = useMutation(api.app.leaveOrganization);
  const [isCreatingOrganization, setCreatingOrganization] = useState(false);

  const removeOrg = (organization: Organization) => {
    void leaveOrganization({ organizationId: organization.id });
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
  const [isConfirmingRemove, setConfirmingRemove] = useState(false);
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingRemove(true);
  };
  return (
    <li>
      <span>{organization.name}</span>
      <span>
        <button className="danger" onClick={handleRemoveClick}>
          <SlBan /> Remove
        </button>
      </span>
      {isConfirmingRemove && (
        <ConfirmDialog
          title="Remove organization"
          message="Are you sure you want to remove this organization from your list? You will need to be invited again by an administrator to rejoin."
          confirmLabel="Remove"
          danger
          onConfirm={() => {
            setConfirmingRemove(false);
            removeOrg(organization);
          }}
          onCancel={() => setConfirmingRemove(false)}
        />
      )}
    </li>
  );
};
