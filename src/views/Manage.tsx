import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { BoardMember, BoardMemberType, Organization, Role } from "../schema";
import { InviteUserDialog } from "../ui/dialogs/InviteUserDialog";
import { SlPlus, SlPencil } from "react-icons/sl";
import { useLoadedAccount } from "../hooks/Account";
import { SubHeader } from "../ui/SubHeader";
import { EditOrganization } from "../ui/forms/Organization";
import { api } from "../convexClient";

import "./Manage.css";

const boardMemberTypes: BoardMemberType[] = ["board", "administration", "other"];
const boardMemberTypeLabels: Record<BoardMemberType, string> = {
  board: "Board Member",
  administration: "Administration",
  other: "Other",
};

const BoardMemberTypeSelect = ({
  value,
  onChange,
  selectRef,
}: {
  value: BoardMemberType | undefined;
  onChange?: (type: BoardMemberType) => void;
  selectRef?: React.Ref<HTMLSelectElement>;
}) => (
  <select
    ref={selectRef}
    aria-label="Type"
    defaultValue={value ?? "other"}
    onChange={onChange ? (e) => onChange(e.target.value as BoardMemberType) : undefined}
  >
    {boardMemberTypes.map((t) => (
      <option key={t} value={t}>
        {boardMemberTypeLabels[t]}
      </option>
    ))}
  </select>
);

const AddBoardMemberForm = ({ org }: { org: Organization }) => {
  const addBoardMember = useMutation(api.app.addBoardMember);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<BoardMemberType>("other");
  const [showing, setShowing] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    void addBoardMember({
      organizationId: org.id,
      name: name.trim(),
      title: title.trim() || undefined,
      email: email.trim() || undefined,
      type,
    }).then(() => {
      setName("");
      setTitle("");
      setEmail("");
      setType("other");
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
      <BoardMemberTypeSelect value={type} onChange={setType} />
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
  const isOfficer = me.canWrite(org);
  const claimedMemberIds = new Set(org.members.map((member) => member.accountId).filter(Boolean));
  const unclaimedBoardMembers = org.members.filter((member) => !member.accountId);
  const linkableAccountEntries = org.members.filter((member) => member.accountId);
  const showActionsColumn = isOfficer || isAdmin;

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
              <th>Type</th>
              <th>Role</th>
              {showActionsColumn && <th></th>}
            </tr>
          </thead>
          <tbody>
            {org.memberships.length === 0 && unclaimedBoardMembers.length === 0 && (
              <tr>
                <td colSpan={showActionsColumn ? 5 : 4}>No members yet.</td>
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
                  isOfficer={isOfficer}
                  boardMember={boardMember}
                />
              );
            })}
            {unclaimedBoardMembers.map((bm) => (
              <UnclaimedBoardMemberRow
                key={bm.id}
                boardMember={bm}
                isAdmin={isAdmin}
                isOfficer={isOfficer}
                linkableAccountEntries={linkableAccountEntries}
              />
            ))}
          </tbody>
        </table>
        {(isAdmin || isOfficer) && (
          <div className="manage-actions">
            {isAdmin && (
              <button onClick={() => setInviteDialogOpen(true)}>
                <SlPlus />
                Invite a new user
              </button>
            )}
            {isOfficer && <AddBoardMemberForm org={org} />}
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

const LinkToAccountControl = ({
  unclaimedMemberId,
  candidates,
}: {
  unclaimedMemberId: string;
  candidates: BoardMember[];
}) => {
  const linkBoardMemberToAccount = useMutation(api.app.linkBoardMemberToAccount);
  const [selectedId, setSelectedId] = useState("");

  if (candidates.length === 0) return null;

  const handleLink = () => {
    if (!selectedId) return;
    const candidate = candidates.find((c) => c.id === selectedId);
    if (
      !candidate ||
      !confirm(
        `Link "${candidate.name}"'s account to this roster entry? This merges the two into one entry and can't be undone.`
      )
    ) {
      return;
    }
    void linkBoardMemberToAccount({
      unclaimedMemberId,
      accountBoardMemberId: selectedId,
    }).then(() => setSelectedId(""));
  };

  return (
    <span className="link-to-account">
      <select
        aria-label="Link to account"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Link to account…</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        className="btn-small btn-secondary"
        disabled={!selectedId}
        onClick={handleLink}
      >
        Link
      </button>
    </span>
  );
};

const UnclaimedBoardMemberRow = ({
  boardMember,
  isAdmin,
  isOfficer,
  linkableAccountEntries,
}: {
  boardMember: BoardMember;
  isAdmin: boolean;
  isOfficer: boolean;
  linkableAccountEntries: BoardMember[];
}) => {
  const updateBoardMember = useMutation(api.app.updateBoardMember);
  const [editing, setEditing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);

  const handleSave = () => {
    const newName = nameRef.current?.value ?? "";
    const newTitle = titleRef.current?.value ?? "";
    const newType = (typeRef.current?.value as BoardMemberType) || "other";
    if (!newName.trim()) return;
    void updateBoardMember({
      memberId: boardMember.id,
      name: newName.trim(),
      title: newTitle.trim() || undefined,
      type: newType,
    }).then(() => setEditing(false));
  };

  if (editing) {
    return (
      <tr className="member unclaimed-member">
        <td><input ref={nameRef} defaultValue={boardMember.name} autoFocus style={{ width: "100%" }} /></td>
        <td><input ref={titleRef} defaultValue={boardMember.title ?? ""} placeholder="Title" style={{ width: "100%" }} /></td>
        <td><BoardMemberTypeSelect value={boardMember.type} selectRef={typeRef} /></td>
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
      <td>{boardMemberTypeLabels[boardMember.type ?? "other"]}</td>
      <td><em>Not joined</em></td>
      {(isOfficer || isAdmin) && (
        <td className="member-actions">
          {isOfficer && (
            <button className="btn-small btn-secondary" onClick={() => setEditing(true)} title="Edit">
              <SlPencil />
            </button>
          )}
          {isAdmin && (
            <LinkToAccountControl
              unclaimedMemberId={boardMember.id}
              candidates={linkableAccountEntries}
            />
          )}
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
  isOfficer: boolean;
  boardMember: BoardMember | undefined;
};

const MemberNode = ({
  id,
  org,
  startingRole,
  name,
  isSelf,
  isAdmin,
  isOfficer,
  boardMember,
}: MemberNodeProps) => {
  const updateRole = useMutation(api.app.updateMembershipRole);
  const updateBoardMember = useMutation(api.app.updateBoardMember);
  const [editingDetails, setEditingDetails] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);

  const saveDetails = () => {
    if (!boardMember) {
      setEditingDetails(false);
      return;
    }
    const newType = (typeRef.current?.value as BoardMemberType) || "other";
    void updateBoardMember({
      memberId: boardMember.id,
      name: boardMember.name,
      title: titleRef.current?.value.trim() || undefined,
      type: newType,
    }).then(() => setEditingDetails(false));
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
        {isOfficer && editingDetails ? (
          <input ref={titleRef} defaultValue={boardMember?.title ?? ""} autoFocus placeholder="Title" style={{ width: "100%" }} />
        ) : (
          <>{boardMember?.title ?? "-"}</>
        )}
      </td>
      <td>
        {isOfficer && editingDetails ? (
          <BoardMemberTypeSelect value={boardMember?.type} selectRef={typeRef} />
        ) : (
          boardMemberTypeLabels[boardMember?.type ?? "other"]
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
      {(isOfficer || isAdmin) && (
        <td className="member-actions">
          {isOfficer && boardMember && (
            editingDetails ? (
              <span style={{ display: "flex", gap: 4 }}>
                <button className="btn-small btn-primary" onClick={saveDetails}>Save</button>
                <button className="btn-small btn-secondary" onClick={() => setEditingDetails(false)}>Cancel</button>
              </span>
            ) : (
              <button className="btn-small btn-secondary" onClick={() => setEditingDetails(true)} title="Edit title/type">
                <SlPencil />
              </button>
            )
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
