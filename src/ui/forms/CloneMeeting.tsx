import { FC, useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Meeting } from "../../schema";
import { api } from "../../convexClient";
import { DateOnlyInput } from "../DateOnlyInput";
import { TimeOfDayInput } from "../TimeOfDayInput";

import "./Organization.css";

export type CloneMeetingProps = {
  meeting: Meeting;
  onCreated?: (meetingId: string) => void;
};

type AgendaSource = "original" | "actual";

export const CloneMeeting: FC<CloneMeetingProps> = ({ meeting, onCreated }) => {
  const navigate = useNavigate();
  const cloneMeeting = useMutation(api.app.cloneMeeting);
  const [date, setDate] = useState<Date | null>(new Date());
  // Defaults to the source meeting's own time of day rather than blank -
  // board meetings usually recur at the same time, so this saves a step in
  // the common case while still being freely editable.
  const [time, setTime] = useState<Date | null>(meeting.date);
  const [agendaSource, setAgendaSource] = useState<AgendaSource>("original");

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!date || !time) {
      return;
    }

    const fullDate = new Date(date);
    fullDate.setHours(time.getHours(), time.getMinutes(), 0, 0);

    void cloneMeeting({
      sourceMeetingId: meeting.id,
      date: fullDate.getTime(),
      agendaSource,
    }).then((meetingId: string) => {
      onCreated?.(meetingId);
      void navigate(`/meetings/${meetingId}/edit`);
    });
  };

  return (
    <form className="organization" onSubmit={handleSave}>
      <div>
        <label>
          Meeting date
          <DateOnlyInput selected={date} onChange={setDate} autoFocus />
        </label>
      </div>
      <div>
        <label>
          Meeting time
          <TimeOfDayInput
            selected={time}
            onChange={setTime}
            aria-label="Meeting time"
          />
        </label>
      </div>
      <div className="clone-meeting-agenda-source">
        <span className="clone-meeting-agenda-source-label">Copy topics from:</span>
        <label>
          <input
            type="radio"
            name="agendaSource"
            value="original"
            checked={agendaSource === "original"}
            onChange={() => setAgendaSource("original")}
          />
          Original agenda
        </label>
        <label>
          <input
            type="radio"
            name="agendaSource"
            value="actual"
            checked={agendaSource === "actual"}
            onChange={() => setAgendaSource("actual")}
          />
          Actual agenda
        </label>
      </div>
      <button type="submit" disabled={!date || !time}>
        Save
      </button>
    </form>
  );
};
