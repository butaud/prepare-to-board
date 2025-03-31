import { useAccount, useCoState } from "jazz-react";
import { EditOrganization } from "../ui/forms/Organization";
import { Group, ID } from "jazz-tools";
import { UserAccount } from "../schema";
import { useState } from "react";
import { InviteUserDialog } from "../ui/dialogs/InviteUserDialog";

import "./Manage.css";
import { Breadcrumbs } from "../ui/Breadcrumbs";

export const Manage = () => {
  const { me } = useAccount({
    root: {
      selectedOrganization: {},
    },
  });
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);

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

  const organizationGroup = me.root.selectedOrganization._owner.castAs(Group);

  const closeDialog = () => {
    setInviteDialogOpen(false);
  };

  const openDialog = () => {
    setInviteDialogOpen(true);
  };

  return (
    <div className="manage">
      <Breadcrumbs />
      {isInviteDialogOpen && (
        <InviteUserDialog
          closeDialog={closeDialog}
          organization={me.root.selectedOrganization}
        />
      )}
      <h3>Organization Details</h3>
      <EditOrganization id={me.root.selectedOrganization.id} />
      <h3>Organization Members</h3>
      <ul>
        {organizationGroup.members.map((member) => (
          <MemberNode
            key={member.id}
            id={member.id}
            organizationGroup={organizationGroup}
            startingRole={member.role}
            isSelf={member.id === me.id}
          />
        ))}
        <li>
          <button onClick={openDialog}>Invite a new user</button>
        </li>
      </ul>
      <p>
        Note: If a user has removed the organization from their list, they may
        not be able to see it even if they are in the list above. If that
        happens, they can use the same invite link as a new user to get access
        to it again.
      </p>
    </div>
  );
};

type MemberNodeProps = {
  id: ID<UserAccount>;
  organizationGroup: Group;
  startingRole: string;
  isSelf: boolean;
};

const MemberNode = ({
  id,
  organizationGroup,
  startingRole,
  isSelf,
}: MemberNodeProps) => {
  const account = useCoState(UserAccount, id, {
    profile: {},
  });

  const membership = organizationGroup.members.find(
    (membership) => membership.id === id
  );

  if (!account || !membership) {
    return null;
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        "Are you sure you want to remove this member from the organization?"
      )
    ) {
      organizationGroup.removeMember(account);
    }
  };

  const handleRoleChange = (newRole: AccountRole) => {
    if (startingRole !== newRole) {
      organizationGroup.addMember(account, newRole);
    }
  };

  return (
    <li className="member">
      <span className={isSelf ? "me" : ""}>{account?.profile.name} </span>
      {!isSelf && (
        <span>
          <RolePicker role={startingRole} onChange={handleRoleChange} />
          <button
            onClick={handleRemoveClick}
            disabled={startingRole === "admin"}
            title={
              startingRole === "admin" ? "Admins cannot be removed" : undefined
            }
          >
            Remove
          </button>
        </span>
      )}
    </li>
  );
};

type AccountRole = "admin" | "writer" | "reader";
type RolePickerProps = {
  role: string;
  onChange: (role: AccountRole) => void;
};
const RolePicker = ({ role, onChange }: RolePickerProps) => {
  const roles: AccountRole[] = ["admin", "writer", "reader"];
  return (
    <select
      value={role}
      onChange={(e) => onChange(e.target.value as AccountRole)}
    >
      {roles.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
};
