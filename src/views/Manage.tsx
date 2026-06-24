import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { BoardMember, Organization, Role } from "../schema";
import { InviteUserDialog } from "../ui/dialogs/InviteUserDialog";
import { SlPlus, SlPencil } from "react-icons/sl";
import { useLoadedAccount } from "../hooks/Account";
import { SubHeader } from "../ui/SubHeader";
import { EditOrganization } from "../ui/forms/Organization";
import { api } from "../convexClient";

import "./Manage.css";

const AddBoardMemberForm = ({ org }: { org: Organization }) => {
  const addBoardMember = useMutation(api.app.addBoardMember);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [showing, setShowing] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    void addBoardMember({
      organizationId: org.id,
      name: name.trim(),
      title: title.trim() || undefined,
      email: email.trim() || undefined,
    }).then(() => {
      setName("");
      setTitle("");
      setEmail("");
      setShowing(false);
    });
  };

  if (!showing) {
    return (
      <button onClick={() => setShowing(true)}>
        <SlPlus /> Add board member
      </button>
    );
  }

  return (
    <div className="add-board-member-form">
      <input placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <input placeholder="Title (e.g. President)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button onClick={handleAdd} disabled={!name.trim()}>Add</button>
      <button onClick={() => setShowing(false)}>Cancel</button>
    </div>
  );
};

export const Manage = () => {
  const me = useLoadedAccount();
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);

  if (!me.root.selectedOrganization) {
    return (
      <h2>
        Please select an organization to manage from the dropdown at the top
        right.
      </h2>
    );
  }

  const org = me.root.selectedOrganization;
  const isAdmin = me.canAdmin(org);
  const claimedMemberIds = new Set(org.members.map((member) => member.accountId).filter(Boolean));
  const unclaimedBoardMembers = org.members.filter((member) => !member.accountId);

  return (
    <div className="manage">
      <SubHeader />
      {isInviteDialogOpen && (
        <InviteUserDialog closeDialog={() => setInviteDialogOpen(false)} organization={org} />
      )}
      {isAdmin && (
        <div className="manage-section">
          <h3>Organization Details</h3>
          <EditOrganization organization={org} />
        </div>
      )}
      <div className="manage-section">
        <h3>Organization Members</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Role</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {org.memberships.length === 0 && unclaimedBoardMembers.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 4 : 3}>No members yet.</td>
              </tr>
            )}
            {org.memberships.map((member) => {
              const boardMember = org.members.find((bm) => bm.accountId === member.userId);
              claimedMemberIds.add(member.userId);
              return (
                <MemberNode
                  key={member.userId}
                  id={member.userId}
                  org={org}
                  startingRole={member.role}
                  name={member.name}
                  isSelf={member.userId === me.id}
                  isAdmin={isAdmin}
                  boardMember={boardMember}
                />
              );
            })}
            {unclaimedBoardMembers.map((bm) => (
              <UnclaimedBoardMemberRow key={bm.id} boardMember={bm} isAdmin={isAdmin} />
            ))}
          </tbody>
        </table>
        {isAdmin && (
          <div className="manage-actions">
            <button onClick={() => setInviteDialogOpen(true)}>
              <SlPlus />
              Invite a new user
            </button>
            <AddBoardMemberForm org={org} />
          </div>
        )}
      </div>
      <p className="manage-note">
        Note: If a user has removed the organization from their list, they may
        not be able to see it even if they are in the list above. If that
        happens, they can use the same invite link as a new user to get access
        to it again.
      </p>
    </div>
  );
};

const UnclaimedBoardMemberRow = ({
  boardMember,
  isAdmin,
}: {
  boardMember: BoardMember;
  isAdmin: boolean;
}) => {
  const updateBoardMember = useMutation(api.app.updateBoardMember);
  const [editing, setEditing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const newName = nameRef.current?.value ?? "";
    const newTitle = titleRef.current?.value ?? "";
    if (!newName.trim()) return;
    void updateBoardMember({
      memberId: boardMember.id,
      name: newName.trim(),
      title: newTitle.trim() || undefined,
    }).then(() => setEditing(false));
  };

  if (editing) {
    return (
      <tr className="member unclaimed-member">
        <td><input ref={nameRef} defaultValue={boardMember.name} autoFocus style={{ width: "100%" }} /></td>
        <td><input ref={titleRef} defaultValue={boardMember.title ?? ""} placeholder="Title" style={{ width: "100%" }} /></td>
        <td><em>Not joined</em></td>
        <td>
          <button className="btn-small btn-primary" onClick={handleSave}>Save</button>
          <button className="btn-small btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="member unclaimed-member">
      <td>{boardMember.name}</td>
      <td>{boardMember.title ?? "-"}</td>
      <td><em>Not joined</em></td>
      {isAdmin && (
        <td>
          <button className="btn-small btn-secondary" onClick={() => setEditing(true)} title="Edit">
            <SlPencil />
          </button>
        </td>
      )}
    </tr>
  );
};

type MemberNodeProps = {
  id: string;
  org: Organization;
  startingRole: Role;
  name: string;
  isSelf: boolean;
  isAdmin: boolean;
  boardMember: BoardMember | undefined;
};

const MemberNode = ({
  id,
  org,
  startingRole,
  name,
  isSelf,
  isAdmin,
  boardMember,
}: MemberNodeProps) => {
  const updateRole = useMutation(api.app.updateMembershipRole);
  const updateBoardMember = useMutation(api.app.updateBoardMember);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const saveTitle = () => {
    if (!boardMember) {
      setEditingTitle(false);
      return;
    }
    void updateBoardMember({
      memberId: boardMember.id,
      name: boardMember.name,
      title: titleRef.current?.value.trim() || undefined,
    }).then(() => setEditingTitle(false));
  };

  const handleRoleChange = (newRole: Role) => {
    if (startingRole !== newRole) {
      if (
        newRole === "admin" &&
        !confirm(
          "Are you sure you want to make this user an admin? You will not be able to change their role back."
        )
      ) {
        return;
      }
      void updateRole({ organizationId: org.id, userId: id, role: newRole });
    }
  };

  return (
    <tr className="member">
      <td className={isSelf ? "me" : ""}>{name + (isSelf ? " (me)" : "")}</td>
      <td>
        {isAdmin && editingTitle ? (
          <span style={{ display: "flex", gap: 4 }}>
            <input ref={titleRef} defaultValue={boardMember?.title ?? ""} autoFocus placeholder="Title" style={{ width: "100%" }} />
            <button className="btn-small btn-primary" onClick={saveTitle}>Save</button>
            <button className="btn-small btn-secondary" onClick={() => setEditingTitle(false)}>Cancel</button>
          </span>
        ) : (
          <>{boardMember?.title ?? "-"}</>
        )}
      </td>
      <td>
        <RolePicker
          role={startingRole}
          onChange={handleRoleChange}
          amIAdmin={isAdmin}
          isSelf={isSelf}
          isMemberAdmin={startingRole === "admin"}
        />
      </td>
      {isAdmin && (
        <td style={{ display: "flex", gap: 4 }}>
          {!editingTitle && boardMember && (
            <button className="btn-small btn-secondary" onClick={() => setEditingTitle(true)} title="Edit title">
              <SlPencil />
            </button>
          )}
        </td>
      )}
    </tr>
  );
};

const roles: Role[] = ["admin", "writer", "reader"];
const roleNames: Record<Role, string> = {
  admin: "Admin",
  writer: "Officer",
  reader: "Member",
};
type RolePickerProps = {
  role: Role;
  onChange: (role: Role) => void;
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
    <select value={role} onChange={(e) => onChange(e.target.value as Role)} aria-label="Role">
      {roles.map((r) => (
        <option key={r} value={r}>
          {roleNames[r]}
        </option>
      ))}
    </select>
  );
};
