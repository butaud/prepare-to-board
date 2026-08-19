import { useState } from "react";
import { useMutation } from "convex/react";
import {
  BoardMember,
  BoardMemberSalutation,
  BoardMemberType,
  Committee,
  Organization,
  Role,
} from "../schema";
import { InviteUserDialog } from "../ui/dialogs/InviteUserDialog";
import { SlPlus, SlPencil, SlTrash } from "react-icons/sl";
import { useLoadedAccount } from "../hooks/Account";
import { SubHeader } from "../ui/SubHeader";
import { EditOrganization } from "../ui/forms/Organization";
import { EditableString } from "../ui/doc/EditableValue";
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
}: {
  value: BoardMemberType | undefined;
  onChange?: (type: BoardMemberType) => void;
}) => (
  <select
    aria-label="Type"
    value={value ?? "other"}
    onChange={onChange ? (e) => onChange(e.target.value as BoardMemberType) : undefined}
  >
    {boardMemberTypes.map((t) => (
      <option key={t} value={t}>
        {boardMemberTypeLabels[t]}
      </option>
    ))}
  </select>
);

const boardMemberSalutations: BoardMemberSalutation[] = ["Mr.", "Mrs.", "Miss"];

const BoardMemberSalutationSelect = ({
  value,
  onChange,
}: {
  value: BoardMemberSalutation | undefined;
  onChange?: (salutation: BoardMemberSalutation | undefined) => void;
}) => (
  <select
    aria-label="Title"
    value={value ?? ""}
    onChange={
      onChange
        ? (e) =>
            onChange((e.target.value || undefined) as BoardMemberSalutation | undefined)
        : undefined
    }
  >
    <option value="">-</option>
    {boardMemberSalutations.map((s) => (
      <option key={s} value={s}>
        {s}
      </option>
    ))}
  </select>
);

const AddBoardMemberForm = ({ org }: { org: Organization }) => {
  const addBoardMember = useMutation(api.app.addBoardMember);
  const [name, setName] = useState("");
  const [office, setOffice] = useState("");
  const [salutation, setSalutation] = useState<BoardMemberSalutation | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [type, setType] = useState<BoardMemberType>("other");
  const [showing, setShowing] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    void addBoardMember({
      organizationId: org.id,
      name: name.trim(),
      title: office.trim() || undefined,
      salutation,
      email: email.trim() || undefined,
      type,
    }).then(() => {
      setName("");
      setOffice("");
      setSalutation(undefined);
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
      <BoardMemberSalutationSelect value={salutation} onChange={setSalutation} />
      <input placeholder="Office (e.g. President)" value={office} onChange={(e) => setOffice(e.target.value)} />
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <BoardMemberTypeSelect value={type} onChange={setType} />
      <button onClick={handleAdd} disabled={!name.trim()}>Add</button>
      <button onClick={() => setShowing(false)}>Cancel</button>
    </div>
  );
};

const committeeTypePlaceholder = "Type (e.g. Board, Finance)";

const CommitteeRow = ({ committee }: { committee: Committee }) => {
  const updateCommittee = useMutation(api.app.updateCommittee);
  const deleteCommittee = useMutation(api.app.deleteCommittee);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(committee.name);
  const [type, setType] = useState(committee.type);

  if (editing) {
    return (
      <tr className="committee-row">
        <td>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ width: "100%" }} />
        </td>
        <td>
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder={committeeTypePlaceholder}
            style={{ width: "100%" }}
          />
        </td>
        <td>
          <button
            className="btn-small btn-primary"
            onClick={() => {
              if (!name.trim()) return;
              void updateCommittee({
                committeeId: committee.id,
                name: name.trim(),
                type: type.trim(),
              }).then(() => setEditing(false));
            }}
          >
            Save
          </button>
          <button
            className="btn-small btn-secondary"
            onClick={() => {
              setName(committee.name);
              setType(committee.type);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="committee-row">
      <td>{committee.name}</td>
      <td>{committee.type}</td>
      <td className="member-actions">
        <button className="btn-small btn-secondary" onClick={() => setEditing(true)} title="Edit">
          <SlPencil />
        </button>
        <button
          className="btn-small btn-secondary"
          onClick={() => void deleteCommittee({ committeeId: committee.id })}
          title="Delete"
        >
          <SlTrash />
        </button>
      </td>
    </tr>
  );
};

const AddCommitteeForm = ({ org }: { org: Organization }) => {
  const addCommittee = useMutation(api.app.addCommittee);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [showing, setShowing] = useState(false);

  const handleAdd = () => {
    if (!name.trim() || !type.trim()) return;
    void addCommittee({
      organizationId: org.id,
      name: name.trim(),
      type: type.trim(),
    }).then(() => {
      setName("");
      setType("");
      setShowing(false);
    });
  };

  if (!showing) {
    return (
      <button onClick={() => setShowing(true)}>
        <SlPlus /> Add committee
      </button>
    );
  }

  return (
    <div className="add-committee-form">
      <input placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <input
        placeholder={`${committeeTypePlaceholder} *`}
        value={type}
        onChange={(e) => setType(e.target.value)}
      />
      <button onClick={handleAdd} disabled={!name.trim() || !type.trim()}>
        Add
      </button>
      <button onClick={() => setShowing(false)}>Cancel</button>
    </div>
  );
};

const CommitteeDocUrlField = ({ org }: { org: Organization }) => {
  const updateCommitteeDocUrl = useMutation(api.app.updateCommitteeDocUrl);
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(org.committeeDocUrl ?? "");

  if (editing) {
    return (
      <div className="committee-doc-url-field">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          autoFocus
          style={{ width: "100%", maxWidth: 400 }}
        />
        <button
          className="btn-small btn-primary"
          onClick={() =>
            void updateCommitteeDocUrl({
              organizationId: org.id,
              committeeDocUrl: url.trim() || undefined,
            }).then(() => setEditing(false))
          }
        >
          Save
        </button>
        <button
          className="btn-small btn-secondary"
          onClick={() => {
            setUrl(org.committeeDocUrl ?? "");
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="committee-doc-url-field">
      <span className="manage-note">
        Committees document link:{" "}
        {org.committeeDocUrl ? org.committeeDocUrl : "Not set"}
      </span>
      <button className="btn-small btn-secondary" onClick={() => setEditing(true)} title="Edit">
        <SlPencil />
      </button>
    </div>
  );
};

const CommitteesManager = ({ org }: { org: Organization }) => (
  <div className="manage-section">
    <h3>Committees</h3>
    <CommitteeDocUrlField org={org} />
    {org.committees.length === 0 ? (
      <p className="manage-note">No committees added yet.</p>
    ) : (
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {org.committees.map((committee) => (
            <CommitteeRow key={committee.id} committee={committee} />
          ))}
        </tbody>
      </table>
    )}
    <div className="manage-actions">
      <AddCommitteeForm org={org} />
    </div>
  </div>
);

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
        <table className="members-table">
          <colgroup>
            <col className="col-name" />
            <col className="col-title" />
            <col className="col-office" />
            <col className="col-type" />
            <col className="col-role" />
            {showActionsColumn && <col className="col-actions" />}
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Office</th>
              <th>Type</th>
              <th>Role</th>
              {showActionsColumn && <th></th>}
            </tr>
          </thead>
          <tbody>
            {org.memberships.length === 0 && unclaimedBoardMembers.length === 0 && (
              <tr>
                <td colSpan={showActionsColumn ? 6 : 5}>No members yet.</td>
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
      {isAdmin && <CommitteesManager org={org} />}
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

  // updateBoardMember patches every field on each call, so a single-field
  // edit still has to carry forward the member's current values for
  // everything else - matching the convention used for meeting metadata.
  const saveField = (
    changes: Partial<Pick<BoardMember, "name" | "salutation" | "title" | "type">>
  ) => {
    void updateBoardMember({
      memberId: boardMember.id,
      name: boardMember.name,
      salutation: boardMember.salutation,
      title: boardMember.title,
      type: boardMember.type,
      ...changes,
    });
  };

  return (
    <tr className="member unclaimed-member">
      <td>
        {isOfficer ? (
          <EditableString
            as="span"
            className="manage-editable-field"
            value={boardMember.name}
            onValueChange={(newValue) => saveField({ name: newValue })}
            canEdit
            autoFocus
            label="Name"
          />
        ) : (
          boardMember.name
        )}
      </td>
      <td>
        {isOfficer ? (
          <BoardMemberSalutationSelect
            value={boardMember.salutation}
            onChange={(newValue) => saveField({ salutation: newValue })}
          />
        ) : (
          (boardMember.salutation ?? "-")
        )}
      </td>
      <td>
        {isOfficer ? (
          <EditableString
            as="span"
            className="manage-editable-field"
            value={boardMember.title ?? ""}
            onValueChange={(newValue) => saveField({ title: newValue || undefined })}
            canEdit
            autoFocus
            label="Office"
            emptyClickBehavior="single"
            placeholder="Add office"
          />
        ) : (
          (boardMember.title ?? "-")
        )}
      </td>
      <td>
        {isOfficer ? (
          <BoardMemberTypeSelect
            value={boardMember.type}
            onChange={(newValue) => saveField({ type: newValue })}
          />
        ) : (
          boardMemberTypeLabels[boardMember.type ?? "other"]
        )}
      </td>
      <td><em>Not joined</em></td>
      {(isOfficer || isAdmin) && (
        <td className="member-actions">
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

  const canEditDetails = isOfficer && Boolean(boardMember);

  // updateBoardMember patches every field on each call, so a single-field
  // edit still has to carry forward the member's current values for
  // everything else - matching the convention used for meeting metadata.
  const saveField = (
    changes: Partial<Pick<BoardMember, "name" | "salutation" | "title" | "type">>
  ) => {
    if (!boardMember) return;
    void updateBoardMember({
      memberId: boardMember.id,
      name: boardMember.name,
      salutation: boardMember.salutation,
      title: boardMember.title,
      type: boardMember.type,
      ...changes,
    });
  };

  // The board member record's name is what minutes/exports actually use
  // (frozen at join time, independent of the account's live Clerk name) -
  // this is the one officers/admins should control so minutes read cleanly
  // without asking a member to fix a typo or capitalization in their own
  // account name.
  const displayName = boardMember?.name ?? name;

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
      <td className={isSelf ? "me" : ""}>
        {canEditDetails ? (
          <EditableString
            as="span"
            className="manage-editable-field"
            value={displayName}
            onValueChange={(newValue) => saveField({ name: newValue })}
            canEdit
            autoFocus
            label="Name"
          />
        ) : (
          displayName
        )}
        {isSelf ? " (me)" : ""}
      </td>
      <td>
        {canEditDetails ? (
          <BoardMemberSalutationSelect
            value={boardMember?.salutation}
            onChange={(newValue) => saveField({ salutation: newValue })}
          />
        ) : (
          (boardMember?.salutation ?? "-")
        )}
      </td>
      <td>
        {canEditDetails ? (
          <EditableString
            as="span"
            className="manage-editable-field"
            value={boardMember?.title ?? ""}
            onValueChange={(newValue) => saveField({ title: newValue || undefined })}
            canEdit
            autoFocus
            label="Office"
            emptyClickBehavior="single"
            placeholder="Add office"
          />
        ) : (
          (boardMember?.title ?? "-")
        )}
      </td>
      <td>
        {canEditDetails ? (
          <BoardMemberTypeSelect
            value={boardMember?.type}
            onChange={(newValue) => saveField({ type: newValue })}
          />
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
      {(isOfficer || isAdmin) && <td className="member-actions" />}
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
