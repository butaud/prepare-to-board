import { Link } from "react-router-dom";
import { CreateOrganization } from "../ui/forms/Organization";
import {
  getUserProfileFormalName,
  type ActionItemNote,
  type Meeting,
} from "../schema";
import { useLoadedAccount } from "../hooks/Account";
import "./Home.css";

type ActionItemWithContext = ActionItemNote & {
  meeting: Meeting;
  topicTitle: string;
};

const formatMeetingDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const meetingDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffDays = Math.round(
    (meetingDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 13) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -13) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const extractActionItems = (meetings: Meeting[]): ActionItemWithContext[] =>
  meetings.flatMap((meeting) =>
    meeting.minutes.flatMap((minute) =>
      (minute.notes ?? [])
        .filter((note): note is ActionItemNote => note.type === "action_item")
        .map((note) => ({ ...note, meeting, topicTitle: minute.topic.title }))
    )
  );

const meetingLink = (meeting: Meeting): string => {
  if (meeting.status === "live") return `/meetings/${meeting.id}/present`;
  if (meeting.status === "completed") return `/meetings/${meeting.id}/minutes`;
  return `/meetings/${meeting.id}`;
};

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

const MeetingCard = ({
  meeting,
  isLive,
}: {
  meeting: Meeting;
  isLive?: boolean;
}) => {
  const topicCount = meeting.plannedAgenda.length;
  return (
    <Link
      to={meetingLink(meeting)}
      className={`meeting-card${isLive ? " live-card" : ""}`}
    >
      <span className="meeting-card-date">
        {formatMeetingDate(meeting.date)}
      </span>
      <span className="meeting-card-meta">
        <StatusBadge status={meeting.status} />
        {topicCount > 0 && (
          <span className="meeting-card-topics">
            {topicCount} topic{topicCount !== 1 ? "s" : ""}
          </span>
        )}
      </span>
    </Link>
  );
};

const ActionItemRow = ({ item }: { item: ActionItemWithContext }) => (
  <div className="action-item">
    <div className="action-item-text">{item.text}</div>
    <div className="action-item-context">
      {item.assignee ? (
        <span className="action-item-assignee">{item.assignee.name}</span>
      ) : (
        <span>Unassigned</span>
      )}
      <span>·</span>
      <Link to={meetingLink(item.meeting)}>
        {formatMeetingDate(item.meeting.date)}
      </Link>
      <span>·</span>
      <span>{item.topicTitle}</span>
    </div>
  </div>
);

export const Home = () => {
  const me = useLoadedAccount();

  if (me.root?.organizations.length === 0) {
    return (
      <>
        <h2>Welcome to Prepare to Board!</h2>
        <p>
          You aren't a member of any organizations yet. If you are trying to
          join an existing organization, please contact the administrator of
          that organization to get an invitation.
        </p>
        <p>Or you may create a new organization to administrate:</p>
        <CreateOrganization />
      </>
    );
  }

  if (!me.root?.selectedOrganization) {
    return <h2>Please select one of your organizations at the top right.</h2>;
  }

  const org = me.root.selectedOrganization;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const liveMeeting = org.meetings.find((m) => m.status === "live");

  const upcomingMeetings = org.meetings
    .filter(
      (m) =>
        m.status !== "live" &&
        m.status !== "completed" &&
        m.date >= today
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  const recentMeetings = org.meetings
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 4);

  const showMeetings =
    !!liveMeeting || upcomingMeetings.length > 0 || recentMeetings.length > 0;

  const myBoardMember = org.members.find((m) => m.accountId === me.id);
  const allActionItems = extractActionItems(org.meetings);

  const myActionItems = myBoardMember
    ? allActionItems.filter((item) => item.assignee?.id === myBoardMember.id)
    : [];

  const recentMeetingIds = new Set(recentMeetings.map((m) => m.id));
  const otherRecentItems = allActionItems
    .filter(
      (item) =>
        recentMeetingIds.has(item.meeting.id) &&
        item.assignee?.id !== myBoardMember?.id
    )
    .slice(0, 8);

  const showActionItems =
    myActionItems.length > 0 || otherRecentItems.length > 0;

  return (
    <div className="home">
      <div className="home-welcome">
        <h2>Welcome, {getUserProfileFormalName(me.profile ?? undefined)}</h2>
      </div>
      <div className="home-grid">
        <section className="home-section">
          <h3>Meetings</h3>
          {!showMeetings && (
            <p className="empty-state">No upcoming or recent meetings.</p>
          )}
          {liveMeeting && (
            <div className="meeting-group">
              <p className="meeting-group-label">Now</p>
              <MeetingCard meeting={liveMeeting} isLive />
            </div>
          )}
          {upcomingMeetings.length > 0 && (
            <div className="meeting-group">
              <p className="meeting-group-label">Upcoming</p>
              {upcomingMeetings.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          )}
          {recentMeetings.length > 0 && (
            <div className="meeting-group">
              <p className="meeting-group-label">Recent</p>
              {recentMeetings.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          )}
          <div className="section-footer">
            <Link to="/meetings">View all meetings →</Link>
          </div>
        </section>

        <section className="home-section">
          <h3>Action Items</h3>
          {!showActionItems && (
            <p className="empty-state">
              No action items from recent meetings.
            </p>
          )}
          {myActionItems.length > 0 && (
            <div className="meeting-group">
              <p className="meeting-group-label">Assigned to me</p>
              {myActionItems.map((item) => (
                <ActionItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
          {otherRecentItems.length > 0 && (
            <div className="meeting-group">
              <p className="meeting-group-label">From recent meetings</p>
              {otherRecentItems.map((item) => (
                <ActionItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
