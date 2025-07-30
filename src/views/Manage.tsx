import { useCoState } from "jazz-tools/react";
import { EditOrganization } from "../ui/forms/Organization";
import { Group, ID } from "jazz-tools";
import { Schema, UserAccount } from "../schema";
import { useState } from "react";
import { InviteUserDialog } from "../ui/dialogs/InviteUserDialog";
import { SlPlus, SlBan } from "react-icons/sl";
import { useLoadedAccount } from "../hooks/Account";
import { SubHeader } from "../ui/SubHeader";

import "./Manage.css";

export const Manage = () => {
  const me = useLoadedAccount();
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
  const isAdmin = me.canAdmin(me.root.selectedOrganization);

  const closeDialog = () => {
    setInviteDialogOpen(false);
  };

  const openDialog = () => {
    setInviteDialogOpen(true);
  };

  return (
    <div className="manage">
      <SubHeader />
      {isInviteDialogOpen && (
        <InviteUserDialog
          closeDialog={closeDialog}
          organization={me.root.selectedOrganization}
        />
      )}
      {isAdmin && (
        <>
          <h3>Organization Details</h3>
          <EditOrganization id={me.root.selectedOrganization.id} />
        </>
      )}
      <h3>Organization Members</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {organizationGroup.members.length === 0 && (
            <tr>
              <td>No members yet.</td>
            </tr>
          )}
          {organizationGroup.members.map((member) => (
            <MemberNode
              key={member.id}
              id={member.id}
              organizationGroup={organizationGroup}
              startingRole={member.role}
              isSelf={member.id === me.id}
              isAdmin={isAdmin}
            />
          ))}
        </tbody>
      </table>
      {isAdmin && (
        <button onClick={openDialog}>
          <SlPlus />
          Invite a new user
        </button>
      )}
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
  isAdmin: boolean;
};

const MemberNode = ({
  id,
  organizationGroup,
  startingRole,
  isSelf,
  isAdmin,
}: MemberNodeProps) => {
  const account = useCoState(Schema.UserAccount, id, {
    resolve: {
      profile: true,
    },
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
      void organizationGroup.removeMember(account);
    }
  };

  const handleRoleChange = (newRole: AccountRole) => {
    if (startingRole !== newRole) {
      if (newRole === "admin") {
        if (
          !confirm(
            "Are you sure you want to make this user an admin? You will not be able to change their role back."
          )
        ) {
          return;
        }
      }
      organizationGroup.addMember(account, newRole);
    }
  };

  return (
    <tr className="member">
      <td className={isSelf ? "me" : ""}>
        {account?.profile.name + (isSelf ? " (me)" : "")}{" "}
      </td>
      <td>
        <RolePicker
          role={startingRole as AccountRole}
          onChange={handleRoleChange}
          amIAdmin={isAdmin}
          isSelf={isSelf}
          isMemberAdmin={startingRole === "admin"}
        />
      </td>
      {isAdmin && !isSelf && (
        <td>
          <button
            className="danger"
            onClick={handleRemoveClick}
            disabled={startingRole === "admin"}
            title={
              startingRole === "admin" ? "Admins cannot be removed" : undefined
            }
          >
            <SlBan />
            Remove
          </button>
        </td>
      )}
    </tr>
  );
};

type AccountRole = "admin" | "writer" | "reader";
const roles: AccountRole[] = ["admin", "writer", "reader"];
const roleNames: Record<AccountRole, string> = {
  admin: "Admin",
  writer: "Officer",
  reader: "Member",
};
type RolePickerProps = {
  role: AccountRole;
  onChange: (role: AccountRole) => void;
  amIAdmin: boolean;
  isSelf: boolean;
  isMemberAdmin: boolean;
};
const RolePicker = ({
  role,
  onChange,
  amIAdmin,
  isSelf,
  isMemberAdmin,
}: RolePickerProps) => {
  const roleDisplay = roleNames[role];
  if (!amIAdmin || isSelf || isMemberAdmin) {
    return roleDisplay;
  }
  return (
    <select
      value={role}
      onChange={(e) => onChange(e.target.value as AccountRole)}
      aria-label="Role"
    >
      {roles.map((r) => (
        <option key={r} value={r}>
          {roleNames[r]}
        </option>
      ))}
    </select>
  );
};
