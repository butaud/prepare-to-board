import { FC, useState } from "react";
import { useMutation } from "convex/react";
import DatePicker from "react-datepicker";
import { Meeting } from "../../schema";
import { api } from "../../convexClient";

import "react-datepicker/dist/react-datepicker.css";
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
  const createMeeting = useMutation(api.app.createMeeting);
  const [date, setDate] = useState<Date | null>(defaultDate);
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
    }).then((meetingId: string) => onCreated?.(meetingId));
  };

  return (
    <form className="organization" onSubmit={handleSave}>
      <div>
        <label>
          Meeting date
          <DatePicker
            selected={date}
            onSelect={setDate}
            dateFormat="M/d/yyyy"
            popperProps={{
              placement: "bottom",
              strategy: "fixed",
            }}
          />
        </label>
      </div>
      <div>
        <label>
          Meeting time
          <DatePicker
            selected={time}
            onChange={setTime}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={15}
            dateFormat="h:mm aa"
            popperProps={{
              placement: "bottom",
              strategy: "fixed",
            }}
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
