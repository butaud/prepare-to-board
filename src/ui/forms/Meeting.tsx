import { FC, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import { Meeting } from "../../schema";
import { api } from "../../convexClient";
import { TimeOfDayInput } from "../TimeOfDayInput";

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
  const navigate = useNavigate();
  const createMeeting = useMutation(api.app.createMeeting);
  // Defaults to today rather than blank - a brand new meeting is far more
  // often for the near future than not, so starting from today saves a
  // click in the common case while still letting a specific calendar-day
  // click (defaultDate) take precedence.
  const [date, setDate] = useState<Date | null>(defaultDate ?? new Date());
  const [time, setTime] = useState<Date | null>(null);
  // Driven explicitly rather than left to react-datepicker's own
  // close-on-select handling, which doesn't reliably close the popup.
  // Starts open so the calendar is visible as soon as the dialog opens,
  // matching the input itself being autofocused.
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(true);
  // When a day is clicked, the browser moves DOM focus back to the text
  // input as soon as the clicked day cell unmounts (since it's no longer
  // in the DOM to hold focus) - and, at least under CDP-driven clicks,
  // that refocus is immediately followed by a genuine click event on the
  // input itself, which would otherwise reopen the popup we just closed.
  // Ignoring input-clicks that land within this window of a selection
  // filters that out while still responding to any real, intentional
  // re-click (which lands well after the browser's own refocus does).
  const lastDateSelectedAtRef = useRef(0);

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
          <DatePicker
            selected={date}
            onChange={(picked) => {
              setDate(picked);
              setIsDatePickerOpen(false);
              lastDateSelectedAtRef.current = Date.now();
            }}
            dateFormat="M/d/yyyy"
            autoFocus
            open={isDatePickerOpen}
            onInputClick={() => {
              if (Date.now() - lastDateSelectedAtRef.current < 250) return;
              setIsDatePickerOpen(true);
            }}
            onClickOutside={() => setIsDatePickerOpen(false)}
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
