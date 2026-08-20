import { FC, ReactNode } from "react";
import {
  MeetingDetailsAccordion,
  MeetingDetailsAccordionProps,
} from "./MeetingDetailsAccordion";

export type MeetingPageHeaderProps = Pick<
  MeetingDetailsAccordionProps,
  "meeting" | "members" | "isOfficer" | "showAttendance"
> & {
  title: string;
  subtitle: ReactNode;
};

// The row above the topic/minutes list on the read-only Agenda and
// Minutes pages, and on Edit Minutes: a title and subtitle (plain text
// on the read views, an editable start-time field on Edit Minutes)
// beside the meeting details accordion.
export const MeetingPageHeader: FC<MeetingPageHeaderProps> = ({
  meeting,
  members,
  isOfficer,
  showAttendance,
  title,
  subtitle,
}) => (
  <div className="minutes-completed-header">
    <div>
      <h2>{title}</h2>
      {subtitle}
    </div>
    <MeetingDetailsAccordion
      meeting={meeting}
      members={members}
      isOfficer={isOfficer}
      showAttendance={showAttendance}
    />
  </div>
);
