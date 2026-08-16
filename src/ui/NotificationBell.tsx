import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LuBell, LuListChecks, LuNotepadText } from "react-icons/lu";
import { MdPublish } from "react-icons/md";
import { useNotifications } from "../hooks/Notifications";
import { useLoadedAccount } from "../hooks/Account";
import { AppNotification, Meeting, NotificationType } from "../schema";
import { formatRelativeMeetingDate, meetingLink } from "../util/actionItems";

import "./NotificationBell.css";

const typeIcon: Record<NotificationType, React.ReactNode> = {
  agenda_published: <MdPublish />,
  minutes_shared: <LuNotepadText />,
  action_item_assigned: <LuListChecks />,
};

const formatNotificationTime = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const NotificationBell = () => {
  const me = useLoadedAccount();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  const meetingForNotification = (notification: AppNotification): Meeting | undefined => {
    if (!notification.meetingId) return undefined;
    for (const org of me.root.organizations) {
      const meeting = org.meetings.find((m) => m.id === notification.meetingId);
      if (meeting) return meeting;
    }
    return undefined;
  };

  const onOpen = () => setIsOpen((open) => !open);

  const onNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      void markRead({ notificationId: notification.id });
    }
    setIsOpen(false);
  };

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell-toggle"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={onOpen}
      >
        <LuBell />
        {unreadCount > 0 && (
          <span className="notification-bell-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-read"
                onClick={() => void markAllRead({})}
              >
                Mark all as read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="notification-empty">You're all caught up.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => {
                const meeting = meetingForNotification(notification);
                const link = meeting
                  ? meetingLink(meeting)
                  : notification.meetingId
                    ? `/meetings/${notification.meetingId}`
                    : undefined;
                const content = (
                  <>
                    <span className="notification-icon">
                      {typeIcon[notification.type]}
                    </span>
                    <span className="notification-body">
                      <span className="notification-message">
                        {notification.message}
                        {meeting && ` (${formatRelativeMeetingDate(meeting.date)})`}
                      </span>
                      <span className="notification-time">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li
                    key={notification.id}
                    className={`notification-item${
                      notification.read ? "" : " is-unread"
                    }`}
                  >
                    {link ? (
                      <Link
                        to={link}
                        className="notification-item-link"
                        onClick={() => onNotificationClick(notification)}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="notification-item-link"
                        onClick={() => onNotificationClick(notification)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
