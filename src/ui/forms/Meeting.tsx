import { FC, useState } from "react";
import { Schema, Meeting } from "../../schema";
import { useAccount } from "jazz-tools/react";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

export type CreateMeetingProps = {
  onCreated?: (meeting: Meeting) => void;
};

export const CreateMeeting: FC<CreateMeetingProps> = ({ onCreated }) => {
  const { me } = useAccount(Schema.UserAccount, {
    resolve: {
      root: {
        selectedOrganization: { meetings: true },
      },
    },
  });
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);

  if (!me || !me.root.selectedOrganization) {
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

    const newMeeting = Schema.Meeting.create(
      {
        date: fullDate,
        plannedAgenda: Schema.ListOfTopics.create(
          [],
          selectedOrganization._owner
        ),
        liveAgenda: Schema.ListOfTopics.create([], selectedOrganization._owner),
        minutes: Schema.ListOfMinutes.create([], selectedOrganization._owner),
        status: "draft",
      },
      selectedOrganization._owner
    );

    if (selectedOrganization) {
      selectedOrganization.meetings.push(newMeeting);
    }
    if (onCreated) {
      onCreated(newMeeting);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setDate(date);
  };
  const handleTimeChange = (time: Date | null) => {
    setTime(time);
  };

  return (
    <form className="organization" onSubmit={handleSave}>
      <div>
        <label>
          Meeting date
          <DatePicker
            selected={date}
            onSelect={handleDateChange}
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
            onChange={handleTimeChange}
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
