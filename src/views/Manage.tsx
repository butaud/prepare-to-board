import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import {
  BoardMember,
  BoardMemberSalutation,
  BoardMemberType,
  CalendarItem,
  Committee,
  Organization,
  Role,
} from "../schema";
import { InviteUserDialog } from "../ui/dialogs/InviteUserDialog";
import { SlPlus, SlPencil, SlTrash } from "react-icons/sl";
import { useLoadedAccount } from "../hooks/Account";
import { SubHeader } from "../ui/SubHeader";
import { EditOrganization } from "../ui/forms/Organization";
import { api } from "../convexClient";

import "./Manage.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

const boardMemberSalutations: BoardMemberSalutation[] = ["Mr.", "Mrs.", "Miss"];

const BoardMemberSalutationSelect = ({
  value,
  onChange,
  selectRef,
}: {
  value: BoardMemberSalutation | undefined;
  onChange?: (salutation: BoardMemberSalutation | undefined) => void;
  selectRef?: React.Ref<HTMLSelectElement>;
}) => (
  <select
    ref={selectRef}
    aria-label="Title"
    defaultValue={value ?? ""}
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

const CalendarItemRow = ({ item }: { item: CalendarItem }) => {
  const updateCalendarItem = useMutation(api.app.updateCalendarItem);
  const deleteCalendarItem = useMutation(api.app.deleteCalendarItem);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  if (editing) {
    return (
      <li className="calendar-item">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          style={{ width: "100%" }}
        />
        <button
          className="btn-small btn-primary"
          onClick={() => {
            if (!text.trim()) return;
            void updateCalendarItem({
              calendarItemId: item.id,
              text: text.trim(),
            }).then(() => setEditing(false));
          }}
        >
          Save
        </button>
        <button
          className="btn-small btn-secondary"
          onClick={() => {
            setText(item.text);
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </li>
    );
  }

  return (
    <li className={`calendar-item${item.completed ? " is-completed" : ""}`}>
      <label className="calendar-item-checkbox">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={(e) =>
            void updateCalendarItem({
              calendarItemId: item.id,
              completed: e.target.checked,
            })
          }
        />
        <span>{item.text}</span>
      </label>
      <span className="calendar-item-actions">
        <button
          className="btn-small btn-secondary"
          onClick={() => setEditing(true)}
          title="Edit"
        >
          <SlPencil />
        </button>
        <button
          className="btn-small btn-secondary"
          onClick={() => void deleteCalendarItem({ calendarItemId: item.id })}
          title="Delete"
        >
          <SlTrash />
        </button>
      </span>
    </li>
  );
};

const AddCalendarItemForm = ({ org }: { org: Organization }) => {
  const addCalendarItem = useMutation(api.app.addCalendarItem);
  const [text, setText] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [showing, setShowing] = useState(false);

  const handleAdd = () => {
    if (!text.trim()) return;
    void addCalendarItem({
      organizationId: org.id,
      month,
      text: text.trim(),
    }).then(() => {
      setText("");
      setShowing(false);
    });
  };

  if (!showing) {
    return (
      <button onClick={() => setShowing(true)}>
        <SlPlus /> Add calendar item
      </button>
    );
  }

  return (
    <div className="add-calendar-item-form">
      <select
        aria-label="Month"
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
      >
        {MONTH_NAMES.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>
      <input
        placeholder="Recurring item *"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <button onClick={handleAdd} disabled={!text.trim()}>
        Add
      </button>
      <button onClick={() => setShowing(false)}>Cancel</button>
    </div>
  );
};

const DEFAULT_CALENDAR_CONTEXT_MONTHS = 2;

const CalendarContextMonthsField = ({ org }: { org: Organization }) => {
  const updateCalendarContextMonths = useMutation(api.app.updateCalendarContextMonths);
  const [editing, setEditing] = useState(false);
  const [months, setMonths] = useState(
    String(org.calendarContextMonths ?? DEFAULT_CALENDAR_CONTEXT_MONTHS)
  );

  if (editing) {
    return (
      <div className="committee-doc-url-field">
        <input
          type="number"
          min={0}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          autoFocus
          style={{ width: 80 }}
        />
        <button
          className="btn-small btn-primary"
          onClick={() => {
            const parsed = Number(months);
            void updateCalendarContextMonths({
              organizationId: org.id,
              calendarContextMonths: Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined,
            }).then(() => setEditing(false));
          }}
        >
          Save
        </button>
        <button
          className="btn-small btn-secondary"
          onClick={() => {
            setMonths(String(org.calendarContextMonths ?? DEFAULT_CALENDAR_CONTEXT_MONTHS));
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
        Months of calendar context in exported minutes (trailing/upcoming):{" "}
        {org.calendarContextMonths ?? DEFAULT_CALENDAR_CONTEXT_MONTHS}
      </span>
      <button className="btn-small btn-secondary" onClick={() => setEditing(true)} title="Edit">
        <SlPencil />
      </button>
    </div>
  );
};

const BoardCalendarManager = ({ org }: { org: Organization }) => {
  const itemsByMonth = new Map<number, CalendarItem[]>();
  org.calendarItems.forEach((item) => {
    const existing = itemsByMonth.get(item.month) ?? [];
    existing.push(item);
    itemsByMonth.set(item.month, existing);
  });

  return (
    <div className="manage-section">
      <h3>Board Calendar</h3>
      <CalendarContextMonthsField org={org} />
      {org.calendarItems.length === 0 ? (
        <p className="manage-note">No recurring calendar items yet.</p>
      ) : (
        MONTH_NAMES.map((name, index) => {
          const items = itemsByMonth.get(index + 1);
          if (!items || items.length === 0) return null;
          return (
            <div key={name} className="calendar-month-group">
              <h4>{name}</h4>
              <ul className="calendar-item-list">
                {items.map((item) => (
                  <CalendarItemRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          );
        })
      )}
      <div className="manage-actions">
        <AddCalendarItemForm org={org} />
      </div>
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
        <table>
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
      {isAdmin && <BoardCalendarManager org={org} />}
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
  const [editing, setEditing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const salutationRef = useRef<HTMLSelectElement>(null);
  const officeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);

  const handleSave = () => {
    const newName = nameRef.current?.value ?? "";
    const newSalutation = (salutationRef.current?.value ||
      undefined) as BoardMemberSalutation | undefined;
    const newOffice = officeRef.current?.value ?? "";
    const newType = (typeRef.current?.value as BoardMemberType) || "other";
    if (!newName.trim()) return;
    void updateBoardMember({
      memberId: boardMember.id,
      name: newName.trim(),
      salutation: newSalutation,
      title: newOffice.trim() || undefined,
      type: newType,
    }).then(() => setEditing(false));
  };

  if (editing) {
    return (
      <tr className="member unclaimed-member">
        <td><input ref={nameRef} defaultValue={boardMember.name} autoFocus style={{ width: "100%" }} /></td>
        <td><BoardMemberSalutationSelect value={boardMember.salutation} selectRef={salutationRef} /></td>
        <td><input ref={officeRef} defaultValue={boardMember.title ?? ""} placeholder="Office" style={{ width: "100%" }} /></td>
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
      <td>{boardMember.salutation ?? "-"}</td>
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
  const salutationRef = useRef<HTMLSelectElement>(null);
  const officeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);

  const saveDetails = () => {
    if (!boardMember) {
      setEditingDetails(false);
      return;
    }
    const newSalutation = (salutationRef.current?.value ||
      undefined) as BoardMemberSalutation | undefined;
    const newType = (typeRef.current?.value as BoardMemberType) || "other";
    void updateBoardMember({
      memberId: boardMember.id,
      name: boardMember.name,
      salutation: newSalutation,
      title: officeRef.current?.value.trim() || undefined,
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
          <BoardMemberSalutationSelect value={boardMember?.salutation} selectRef={salutationRef} />
        ) : (
          <>{boardMember?.salutation ?? "-"}</>
        )}
      </td>
      <td>
        {isOfficer && editingDetails ? (
          <input ref={officeRef} defaultValue={boardMember?.title ?? ""} autoFocus placeholder="Office" style={{ width: "100%" }} />
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
              <button className="btn-small btn-secondary" onClick={() => setEditingDetails(true)} title="Edit title/office/type">
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
