import { useState } from "react";
import { CreateMeetingDialog } from "../../ui/dialogs/CreateMeetingDialog";
import { Link } from "react-router-dom";
import { SlPlus } from "react-icons/sl";
import { useLoadedAccount } from "../../hooks/Account";
import { SubHeader } from "../../ui/SubHeader";
import { MeetingCalendar } from "./MeetingCalendar";
import { MdFormatListBulleted } from "react-icons/md";
import { IoCalendarOutline } from "react-icons/io5";
import { type Meeting } from "../../schema";
import "./MeetingList.css";

const meetingLink = (meeting: Meeting): string => {
  if (meeting.status === "live") return `/meetings/${meeting.id}/present`;
  if (meeting.status === "completed") return `/meetings/${meeting.id}/minutes`;
  return `/meetings/${meeting.id}`;
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const countActionItems = (meeting: Meeting): number =>
  meeting.minutes.reduce(
    (sum, minute) =>
      sum +
      (minute.notes ?? []).filter((n) => n.type === "action_item").length,
    0
  );

const StatusBadge = ({ status }: { status: Meeting["status"] }) => {
  const labels: Record<Meeting["status"], string> = {
    draft: "Draft",
    published: "Scheduled",
    live: "Live",
    completed: "Completed",
  };
  return (
    <span className={`status-badge status-${status}`}>{labels[status]}</span>
  );
};

const MeetingCard = ({ meeting }: { meeting: Meeting }) => {
  const topicCount = meeting.plannedAgenda.length;
  const actionItemCount =
    meeting.status === "completed" ? countActionItems(meeting) : 0;

  return (
    <Link
      to={meetingLink(meeting)}
      className={`meeting-list-card${meeting.status === "live" ? " live-card" : ""}`}
    >
      <span className="card-date">{formatDate(meeting.date)}</span>
      <span className="card-meta">
        <StatusBadge status={meeting.status} />
        {topicCount > 0 && (
          <span className="card-detail">
            {topicCount} topic{topicCount !== 1 ? "s" : ""}
          </span>
        )}
        {actionItemCount > 0 && (
          <span className="card-detail">
            {actionItemCount} action item{actionItemCount !== 1 ? "s" : ""}
          </span>
        )}
      </span>
    </Link>
  );
};

type Section = {
  label: string;
  meetings: Meeting[];
};

const groupMeetings = (meetings: Meeting[]): Section[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const live = meetings.filter((m) => m.status === "live");
  const upcoming = meetings
    .filter((m) => m.status !== "live" && m.status !== "completed" && m.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const pastMonth = meetings
    .filter((m) => m.status === "completed" && m.date >= thirtyDaysAgo)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const pastYear = meetings
    .filter(
      (m) =>
        m.status === "completed" &&
        m.date >= oneYearAgo &&
        m.date < thirtyDaysAgo
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const older = meetings
    .filter((m) => m.status === "completed" && m.date < oneYearAgo)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return [
    { label: "Live", meetings: live },
    { label: "Upcoming", meetings: upcoming },
    { label: "Past Month", meetings: pastMonth },
    { label: "Past Year", meetings: pastYear },
    { label: "Older", meetings: older },
  ].filter((s) => s.meetings.length > 0);
};

export const MeetingList = () => {
  const me = useLoadedAccount();
  const [isCreateMeetingOpen, setCreateMeetingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");

  if (!me.root.selectedOrganization) {
    return <p>No organization selected</p>;
  }

  const isOfficer =
    me?.root.selectedOrganization && me.canWrite(me.root.selectedOrganization);

  const myMeetings = isOfficer
    ? me.root.selectedOrganization.meetings
    : me.root.selectedOrganization.meetings.filter(
        (meeting) => meeting.status !== "draft"
      );

  const sections = groupMeetings(myMeetings);

  return (
    <div>
      {isCreateMeetingOpen && (
        <CreateMeetingDialog
          closeDialog={() => {
            setCreateMeetingOpen(false);
            setSelectedDate(null);
          }}
          defaultDate={selectedDate}
        />
      )}
      <SubHeader
        tabs={[
          {
            icon: <MdFormatListBulleted />,
            label: "List",
            onClick: () => setView("list"),
            isActive: view === "list",
          },
          {
            icon: <IoCalendarOutline />,
            label: "Calendar",
            onClick: () => setView("calendar"),
            isActive: view === "calendar",
          },
        ]}
        actions={
          isOfficer
            ? [
                {
                  label: "Create a new meeting",
                  onClick: () => {
                    setSelectedDate(null);
                    setCreateMeetingOpen(true);
                  },
                  icon: <SlPlus />,
                },
              ]
            : undefined
        }
      />
      {view === "list" ? (
        <div className="meeting-list">
          {sections.length === 0 && (
            <p className="empty-section">No meetings have been scheduled yet.</p>
          )}
          {sections.map((section) => (
            <div key={section.label} className="meeting-list-section">
              <h3>{section.label}</h3>
              {section.meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <MeetingCalendar
          meetings={myMeetings}
          onAddMeeting={
            isOfficer
              ? (date) => {
                  setSelectedDate(date);
                  setCreateMeetingOpen(true);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
