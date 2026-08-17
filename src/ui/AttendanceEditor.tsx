import { FC } from "react";
import { AttendanceEntry, BoardMember, BoardMemberType } from "../schema";

import "./AttendanceEditor.css";

export type AttendanceEditorProps = {
  members: BoardMember[];
  attendance: AttendanceEntry[] | undefined;
  onChange: (attendance: AttendanceEntry[]) => void;
  canEdit: boolean;
};

const GROUPS: BoardMemberType[] = ["board", "administration", "other"];
const GROUP_LABELS: Record<BoardMemberType, string> = {
  board: "Board Members",
  administration: "Administration",
  other: "Others",
};

export const AttendanceEditor: FC<AttendanceEditorProps> = ({
  members,
  attendance,
  onChange,
  canEdit,
}) => {
  const attendanceByMember = new Map(
    (attendance ?? []).map((entry) => [entry.boardMemberId, entry.present])
  );

  const setPresence = (boardMemberId: string, present: boolean) => {
    const next = (attendance ?? []).filter(
      (entry) => entry.boardMemberId !== boardMemberId
    );
    next.push({ boardMemberId, present });
    onChange(next);
  };

  return (
    <div className="attendance-editor">
      {GROUPS.map((group) => {
        // Roster entries created before the `type` field existed have no
        // type set - treat them as "board" so they still show up somewhere.
        const groupMembers = members.filter(
          (member) => (member.type ?? "board") === group
        );
        if (groupMembers.length === 0) return null;
        return (
          <div key={group} className="attendance-group">
            <h4>{GROUP_LABELS[group]}</h4>
            <ul className="attendance-list">
              {groupMembers.map((member) => {
                const present = attendanceByMember.get(member.id);
                return (
                  <li key={member.id} className="attendance-row">
                    <span className="attendance-name">{member.name}</span>
                    {canEdit ? (
                      <div className="attendance-toggle">
                        <button
                          type="button"
                          className={`attendance-toggle-btn${
                            present === true ? " is-active is-present" : ""
                          }`}
                          onClick={() => setPresence(member.id, true)}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`attendance-toggle-btn${
                            present === false ? " is-active is-absent" : ""
                          }`}
                          onClick={() => setPresence(member.id, false)}
                        >
                          Absent
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`attendance-status${
                          present === undefined
                            ? ""
                            : present
                              ? " is-present"
                              : " is-absent"
                        }`}
                      >
                        {present === undefined
                          ? "—"
                          : present
                            ? "Present"
                            : "Absent"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};
