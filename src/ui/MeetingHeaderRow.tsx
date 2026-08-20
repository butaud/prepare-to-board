import { FC, ReactNode } from "react";
import {
  MeetingDetailsAccordion,
  MeetingDetailsAccordionProps,
} from "./MeetingDetailsAccordion";

export type MeetingHeaderRowProps = Pick<
  MeetingDetailsAccordionProps,
  "meeting" | "members" | "isOfficer" | "showAttendance"
> & {
  children: ReactNode;
};

// The row above the Timeline/topic-editor grid on both Edit Agenda and
// Take Minutes: editable time field(s) on the left, the meeting details
// accordion filling the rest of the row beside them.
export const MeetingHeaderRow: FC<MeetingHeaderRowProps> = ({
  meeting,
  members,
  isOfficer,
  showAttendance,
  children,
}) => (
  <div className="plan-header">
    <div className="plan-header-times">{children}</div>
    <MeetingDetailsAccordion
      meeting={meeting}
      members={members}
      isOfficer={isOfficer}
      showAttendance={showAttendance}
    />
  </div>
);
