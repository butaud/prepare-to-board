import { useCoState } from "jazz-tools/react";
import { EditOrganization } from "../ui/forms/Organization";
import { Group, ID } from "jazz-tools";
import { BoardMember, Organization, Schema, UserAccount } from "../schema";
import { useRef, useState } from "react";
import { InviteUserDialog } from "../ui/dialogs/InviteUserDialog";
import { SlPlus, SlPencil, SlTrash } from "react-icons/sl";
import { useLoadedAccount } from "../hooks/Account";
import { SubHeader } from "../ui/SubHeader";

import "./Manage.css";

const AddBoardMemberForm = ({ org }: { org: Organization }) => {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [showing, setShowing] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    const owningGroup = org._owner.castAs(Group);
    const member = Schema.BoardMember.create(
      { name: name.trim(), title: title.trim() || undefined, email: email.trim() || undefined },
      owningGroup
    );
    if (!org.members) {
      org.members = Schema.ListOfBoardMembers.create([member], owningGroup);
    } else {
      org.members.push(member);
    }
    setName("");
    setTitle("");
    setEmail("");
    setShowing(false);
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
      <input
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <input
        placeholder="Title (e.g. President)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleAdd} disabled={!name.trim()}>
        Add
      </button>
      <button onClick={() => setShowing(false)}>Cancel</button>
    </div>
  );
};

export const Manage = () => {
  const me = useLoadedAccount();
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Load org with members resolved separately (Organization base type doesn't include members depth)
  const orgWithMembers = useCoState(Schema.Organization, me.root.selectedOrganization?.id, {
    resolve: { members: { $each: true } },
  });

  if (!me.root.selectedOrganization) {
    return (
      <h2>
        Please select an organization to manage from the dropdown at the top
        right.
      </h2>
    );
  }

  const org = orgWithMembers ?? me.root.selectedOrganization;
  const organizationGroup = org._owner.castAs(Group);
  const isAdmin = me.canAdmin(org);
  const boardMembers = ((orgWithMembers?.members ?? []) as (BoardMember | null)[]).filter(
    (m): m is BoardMember => m !== null
  );

  // Unclaimed board members (no account linked)
  const unclaimedBoardMembers = boardMembers.filter((bm) => !bm.accountId);

  const closeDialog = () => setInviteDialogOpen(false);
  const openDialog = () => setInviteDialogOpen(true);

  return (
    <div className="manage">
      <SubHeader />
      {isInviteDialogOpen && (
        <InviteUserDialog
          closeDialog={closeDialog}
          organization={org}
        />
      )}
      {isAdmin && (
        <>
          <h3>Organization Details</h3>
          <EditOrganization id={org.id} />
        </>
      )}
      <h3>Organization Members</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Title</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {organizationGroup.members.length === 0 &&
            unclaimedBoardMembers.length === 0 && (
              <tr>
                <td colSpan={3}>No members yet.</td>
              </tr>
            )}
          {/* Jazz Group members — may or may not have a board member entry */}
          {organizationGroup.members.map((member: { id: string; role: string }) => {
            const boardMember = boardMembers.find(
              (bm) => bm.accountId === member.id
            );
            return (
              <MemberNode
                key={member.id}
                id={member.id}
                org={org}
                organizationGroup={organizationGroup}
                startingRole={member.role}
                isSelf={member.id === me.id}
                isAdmin={isAdmin}
                boardMember={boardMember}
              />
            );
          })}
          {/* Unclaimed board members — not yet in the Jazz Group */}
          {unclaimedBoardMembers.map((bm) => (
            <UnclaimedBoardMemberRow key={bm.id} boardMember={bm} isAdmin={isAdmin} />
          ))}
        </tbody>
      </table>
      {isAdmin && (
        <div className="manage-actions">
          <button onClick={openDialog}>
            <SlPlus />
            Invite a new user
          </button>
          <AddBoardMemberForm org={org} />
        </div>
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

const UnclaimedBoardMemberRow = ({
  boardMember,
  isAdmin,
}: {
  boardMember: BoardMember;
  isAdmin: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const newName = nameRef.current?.value ?? "";
    const newTitle = titleRef.current?.value ?? "";
    if (!newName.trim()) return;
    boardMember.name = newName.trim();
    boardMember.title = newTitle.trim() || undefined;
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="member unclaimed-member">
        <td>
          <input
            ref={nameRef}
            defaultValue={boardMember.name}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            autoFocus
            style={{ width: "100%" }}
          />
        </td>
        <td>
          <input
            ref={titleRef}
            defaultValue={boardMember.title ?? ""}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            placeholder="Title"
            style={{ width: "100%" }}
          />
        </td>
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
      <td>{boardMember.title ?? "—"}</td>
      <td><em>Not joined</em></td>
      {isAdmin && (
        <td>
          <button
            className="btn-small btn-secondary"
            onClick={() => setEditing(true)}
            title="Edit"
          >
            <SlPencil />
          </button>
        </td>
      )}
    </tr>
  );
};

type MemberNodeProps = {
  id: ID<UserAccount>;
  org: Organization;
  organizationGroup: Group;
  startingRole: string;
  isSelf: boolean;
  isAdmin: boolean;
  boardMember: BoardMember | undefined;
};

const MemberNode = ({
  id,
  org,
  organizationGroup,
  startingRole,
  isSelf,
  isAdmin,
  boardMember,
}: MemberNodeProps) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

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

  const saveTitle = () => {
    const titleValue = titleRef.current?.value ?? "";
    if (boardMember) {
      boardMember.title = titleValue.trim() || undefined;
    } else if (titleValue.trim() && account) {
      // Create a board member entry for this Jazz Group member
      const owningGroup = org._owner.castAs(Group);
      const newBoardMember = Schema.BoardMember.create(
        { name: account.profile.name, title: titleValue.trim(), accountId: account.id },
        owningGroup
      );
      if (!org.members) {
        org.members = Schema.ListOfBoardMembers.create([newBoardMember], owningGroup);
      } else {
        org.members.push(newBoardMember);
      }
    }
    setEditingTitle(false);
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
        {account?.profile.name + (isSelf ? " (me)" : "")}
      </td>
      <td>
        {isAdmin && editingTitle ? (
          <span style={{ display: "flex", gap: 4 }}>
            <input
              ref={titleRef}
              defaultValue={boardMember?.title ?? ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") { saveTitle(); }
                if (e.key === "Escape") setEditingTitle(false);
              }}
              autoFocus
              placeholder="Title"
              style={{ width: "100%" }}
            />
            <button className="btn-small btn-primary" onClick={saveTitle}>Save</button>
            <button className="btn-small btn-secondary" onClick={() => setEditingTitle(false)}>Cancel</button>
          </span>
        ) : (
          <>{boardMember?.title ?? "—"}</>
        )}
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
      {isAdmin && (
        <td style={{ display: "flex", gap: 4 }}>
          {!editingTitle && (
            <button
              className="btn-small btn-secondary"
              onClick={() => setEditingTitle(true)}
              title="Edit title"
            >
              <SlPencil />
            </button>
          )}
          {!isSelf && (
            <button
              className="danger"
              onClick={handleRemoveClick}
              disabled={startingRole === "admin"}
              title="Remove member"
            >
              <SlTrash />
            </button>
          )}
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
