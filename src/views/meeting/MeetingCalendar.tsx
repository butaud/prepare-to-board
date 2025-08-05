import { useState } from "react";
import { Link } from "react-router-dom";
import { SlPlus } from "react-icons/sl";
import "./MeetingCalendar.css";

interface Meeting {
  id: string;
  date?: Date | null;
}

interface MeetingCalendarProps {
  meetings: Meeting[];
  onAddMeeting?: (date: Date) => void;
}

const buildWeeks = (current: Date) => {
  const year = current.getFullYear();
  const month = current.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  const weeks: Date[][] = [];
  const day = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
};

export const MeetingCalendar = ({
  meetings,
  onAddMeeting,
}: MeetingCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const weeks = buildWeeks(currentMonth);
  const month = currentMonth.getMonth();

  const meetingsByDay = new Map<string, Meeting[]>();
  meetings.forEach((m) => {
    if (!m.date) return;
    const key = `${m.date.getFullYear()}-${m.date.getMonth()}-${m.date.getDate()}`;
    const arr = meetingsByDay.get(key) ?? [];
    arr.push(m);
    meetingsByDay.set(key, arr);
  });

  const prevMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  const nextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="meeting-calendar">
      <div className="navigation">
        <button onClick={prevMonth}>{"<"}</button>
        <span>
          {currentMonth.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button onClick={nextMonth}>{">"}</button>
        <button onClick={goToCurrentMonth}>Today</button>
      </div>
      <table>
        <thead>
          <tr>
            {weekdayNames.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((date, j) => {
                const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                const dayMeetings = meetingsByDay.get(key) ?? [];
                const isCurrentMonth = date.getMonth() === month;
                const isToday =
                  date.toDateString() === new Date().toDateString();
                return (
                  <td
                    key={j}
                    className={
                      (isCurrentMonth ? "" : "outside-month") +
                      (isToday ? " today" : "")
                    }
                  >
                    <div className="date">{date.getDate()}</div>
                    {dayMeetings.length > 0 && (
                      <div className="meetings">
                        {dayMeetings.map((m) => (
                          <Link to={`/meetings/${m.id}`} key={m.id}>
                            {m.date?.toLocaleTimeString([], {
                              timeStyle: "short",
                            }) ?? "No time"}
                          </Link>
                        ))}
                      </div>
                    )}
                    {dayMeetings.length === 0 && onAddMeeting && (
                      <button
                        aria-label={`Add meeting on ${date.toLocaleDateString()}`}
                        onClick={() => onAddMeeting(date)}
                        className="add-meeting"
                      >
                        <SlPlus />
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {meetings.length === 0 && <p>No meetings have been scheduled yet.</p>}
    </div>
  );
};
