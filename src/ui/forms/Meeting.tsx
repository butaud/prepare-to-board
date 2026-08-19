import { FC, useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Meeting } from "../../schema";
import { api } from "../../convexClient";
import { DateOnlyInput } from "../DateOnlyInput";
import { TimeOfDayInput } from "../TimeOfDayInput";

import { useLoadedAccount } from "../../hooks/Account";

export type CreateMeetingProps = {
  onCreated?: (meetingId: string) => void;
  defaultDate?: Date | null;
};

export const CreateMeeting: FC<CreateMeetingProps> = ({
  onCreated,
  defaultDate = null,
}) => {
  const me = useLoadedAccount();
  const navigate = useNavigate();
  const createMeeting = useMutation(api.app.createMeeting);
  // Defaults to today rather than blank - a brand new meeting is far more
  // often for the near future than not, so starting from today saves a
  // click in the common case while still letting a specific calendar-day
  // click (defaultDate) take precedence.
  const [date, setDate] = useState<Date | null>(defaultDate ?? new Date());
  const [time, setTime] = useState<Date | null>(null);

  if (!me.root.selectedOrganization) {
    return null;
  }

  const selectedOrganization = me.root.selectedOrganization;

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!date || !time) {
      return;
    }

    const fullDate = new Date(date);
    fullDate.setHours(time.getHours(), time.getMinutes(), 0, 0);

    void createMeeting({
      organizationId: selectedOrganization.id,
      date: fullDate.getTime(),
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
      <button type="submit" disabled={!date || !time}>
        Save
      </button>
    </form>
  );
};

export type { Meeting };
