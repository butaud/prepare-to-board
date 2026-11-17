import { Link } from "react-router-dom";
import { CreateOrganization } from "../ui/forms/Organization";
import {
  getUserProfileFormalName,
  isAgendaUpdatedSinceViewed,
  type MeetingSummary,
} from "../schema";
import { useLoadedAccount } from "../hooks/Account";
import { useActionItems, useMeetingSummaries } from "../hooks/OrganizationData";
import { ActionItemRow } from "../ui/ActionItemRow";
import { formatRelativeMeetingDate, meetingLink } from "../util/actionItems";
import "./Home.css";

const StatusBadge = ({ status }: { status: MeetingSummary["status"] }) => {
  const labels: Record<MeetingSummary["status"], string> = {
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
  meeting: MeetingSummary;
  isLive?: boolean;
}) => {
  const topicCount = meeting.plannedTopicCount;
  return (
    <Link
      to={meetingLink(meeting)}
      className={`meeting-card${isLive ? " live-card" : ""}`}
    >
      <span className="meeting-card-date">
        {formatRelativeMeetingDate(meeting.date)}
      </span>
      <span className="meeting-card-meta">
        <StatusBadge status={meeting.status} />
        {isAgendaUpdatedSinceViewed(meeting) && (
          <span className="updated-badge">Updated</span>
        )}
        {topicCount > 0 && (
          <span className="meeting-card-topics">
            {topicCount} topic{topicCount !== 1 ? "s" : ""}
          </span>
        )}
      </span>
    </Link>
  );
};

export const Home = () => {
  const me = useLoadedAccount();
  const meetingSummaries = useMeetingSummaries();
  const actionItems = useActionItems();

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
  const meetings = meetingSummaries ?? [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const liveMeeting = meetings.find((m) => m.status === "live");

  const upcomingMeetings = meetings
    .filter(
      (m) =>
        m.status !== "live" &&
        m.status !== "completed" &&
        m.date >= today
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  const recentMeetings = meetings
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 4);

  const showMeetings =
    !!liveMeeting || upcomingMeetings.length > 0 || recentMeetings.length > 0;

  const myBoardMember = org.members.find((m) => m.accountId === me.id);
  const isOfficer = me.canWrite(org);
  const allActionItems = actionItems ?? [];

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
          {meetingSummaries === undefined && <p className="empty-state">Loading...</p>}
          {meetingSummaries !== undefined && !showMeetings && (
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
          {actionItems === undefined && <p className="empty-state">Loading...</p>}
          {actionItems !== undefined && !showActionItems && (
            <p className="empty-state">
              No action items from recent meetings.
            </p>
          )}
          {myActionItems.length > 0 && (
            <div className="meeting-group">
              <p className="meeting-group-label">Assigned to me</p>
              {myActionItems.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  canToggle
                  canEdit={false}
                  members={org.members}
                  meetings={meetings}
                />
              ))}
            </div>
          )}
          {otherRecentItems.length > 0 && (
            <div className="meeting-group">
              <p className="meeting-group-label">From recent meetings</p>
              {otherRecentItems.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  canToggle={isOfficer}
                  canEdit={false}
                  members={org.members}
                  meetings={meetings}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
