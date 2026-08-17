import { FC, useState } from "react";
import { useMutation } from "convex/react";
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from "react-icons/md";
import { BoardMember, Meeting } from "../schema";
import { api } from "../convexClient";
import { EditableString } from "./doc/EditableValue";
import { AttendanceEditor } from "./AttendanceEditor";

import "./MeetingDetailsAccordion.css";

export type MeetingDetailsAccordionProps = {
  meeting: Meeting;
  members: BoardMember[];
  isOfficer: boolean;
};

export const MeetingDetailsAccordion: FC<MeetingDetailsAccordionProps> = ({
  meeting,
  members,
  isOfficer,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const updateMeetingMetadata = useMutation(api.app.updateMeetingMetadata);
  const updateAttendance = useMutation(api.app.updateAttendance);

  // updateMeetingMetadata patches all of its optional fields on every call
  // (matching updateBoardMember's convention), so every call here must carry
  // forward the meeting's current values for anything not being changed.
  const handleMetadataChange = (changes: {
    title?: string;
    subtitle?: string;
    location?: string;
    callerId?: string;
    callerName?: string;
  }) => {
    void updateMeetingMetadata({
      meetingId: meeting.id,
      title: meeting.title,
      subtitle: meeting.subtitle,
      location: meeting.location,
      callerId: meeting.callerId,
      callerName: meeting.callerName,
      ...changes,
    });
  };

  // The caller is always a board member - a role title from Administration
  // or Other doesn't fit the "called the meeting to order" framing, and
  // board members already have a "title" field on their roster entry
  // (President, Treasurer, etc.) that doubles as their caller role.
  const boardMembers = members.filter((member) => (member.type ?? "board") === "board");
  const callerMember = members.find((member) => member.id === meeting.callerId);

  const presentCount = (meeting.attendance ?? []).filter((e) => e.present).length;
  const absentCount = (meeting.attendance ?? []).filter((e) => !e.present).length;
  const summaryParts = [meeting.title, meeting.subtitle, meeting.location].filter(
    (part): part is string => Boolean(part)
  );
  if (presentCount + absentCount > 0) {
    summaryParts.push(`${presentCount} present, ${absentCount} absent`);
  }
  const summary = summaryParts.length > 0 ? summaryParts.join(" · ") : "No details set yet";

  return (
    <div className="meeting-details-accordion">
      <button
        type="button"
        className="meeting-details-header"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <MdKeyboardArrowDown aria-hidden="true" />
        ) : (
          <MdKeyboardArrowRight aria-hidden="true" />
        )}
        <span className="meeting-details-title">Meeting Details</span>
        {!isExpanded && <span className="meeting-details-summary">{summary}</span>}
      </button>
      {isExpanded && (
        <div className="meeting-details-body">
          <div className="meeting-details-fields">
            {(isOfficer || meeting.title) && (
              <div className="meeting-details-field-row">
                <span className="meeting-details-field-label">Title:</span>
                <EditableString
                  as="span"
                  value={meeting.title ?? ""}
                  onValueChange={(newValue) => handleMetadataChange({ title: newValue })}
                  canEdit={isOfficer}
                  label="Meeting title"
                  emptyClickBehavior="single"
                  placeholder="Add title"
                />
              </div>
            )}
            {(isOfficer || meeting.subtitle) && (
              <div className="meeting-details-field-row">
                <span className="meeting-details-field-label">Subtitle:</span>
                <EditableString
                  as="span"
                  value={meeting.subtitle ?? ""}
                  onValueChange={(newValue) => handleMetadataChange({ subtitle: newValue })}
                  canEdit={isOfficer}
                  label="Meeting subtitle"
                  emptyClickBehavior="single"
                  placeholder="Add subtitle"
                />
              </div>
            )}
            {(isOfficer || meeting.location) && (
              <div className="meeting-details-field-row">
                <span className="meeting-details-field-label">Location:</span>
                <EditableString
                  as="span"
                  value={meeting.location ?? ""}
                  onValueChange={(newValue) => handleMetadataChange({ location: newValue })}
                  canEdit={isOfficer}
                  label="Meeting location"
                  emptyClickBehavior="single"
                  placeholder="Add location"
                />
              </div>
            )}
            {(isOfficer || meeting.callerName) && (
              <div className="meeting-details-field-row">
                <span className="meeting-details-field-label">Called by:</span>
                {isOfficer ? (
                  <select
                    value={meeting.callerId ?? ""}
                    onChange={(e) => {
                      const selectedId = e.target.value || undefined;
                      const selectedMember = boardMembers.find(
                        (member) => member.id === selectedId
                      );
                      handleMetadataChange({
                        callerId: selectedId,
                        callerName: selectedMember?.name,
                      });
                    }}
                  >
                    <option value="">Not set</option>
                    {boardMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>
                    {meeting.callerName}
                    {callerMember?.title ? ` (${callerMember.title})` : ""}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="meeting-details-attendance">
            <h4>Attendance</h4>
            <AttendanceEditor
              members={members}
              attendance={meeting.attendance}
              canEdit={isOfficer}
              onChange={(attendance) =>
                void updateAttendance({ meetingId: meeting.id, attendance })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
