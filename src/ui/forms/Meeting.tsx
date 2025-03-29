import { FC, FormEvent, useEffect, useState } from "react";
import { DraftMeeting, Meeting } from "../../schema";
import { useAccount, useCoState } from "jazz-react";
import { ID } from "jazz-tools";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

type MeetingFormProps = {
  meeting: Meeting | DraftMeeting;
  onSave?: (e: FormEvent<HTMLFormElement>) => void;
};

const MeetingForm: FC<MeetingFormProps> = ({ meeting, onSave }) => {
  return (
    <form className="organization" onSubmit={onSave}>
      <div>
        <label>
          Meeting time
          <DatePicker
            selected={meeting.date}
            onChange={(date) => (meeting.date = date ?? undefined)}
            dateFormat="yyyy/MM/dd h:mm aa"
            placeholderText="Meeting date and time"
            showTimeSelect
            timeFormat="h:mm aa"
            popperProps={{
              placement: "bottom",
              strategy: "fixed",
            }}
          />
        </label>
      </div>
      {onSave && <button type="submit">Save</button>}
    </form>
  );
};

export type CreateMeetingProps = {
  onCreated?: (meeting: Meeting) => void;
};

export const CreateMeeting: FC<CreateMeetingProps> = ({ onCreated }) => {
  const { me } = useAccount({
    root: {
      selectedOrganization: { meetings: [] },
    },
  });
  const [draft, setDraft] = useState<DraftMeeting>();
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setDraft(DraftMeeting.create({}));
  }, [me?.id]);

  if (!me || !me.root.selectedOrganization) {
    return null;
  }

  const selectedOrganization = me.root.selectedOrganization;

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft) return;
    const validationErrors = draft.validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);

    const newMeeting = Meeting.create(
      {
        date: draft.date!,
      },
      selectedOrganization._owner
    );

    if (selectedOrganization) {
      selectedOrganization.meetings.push(newMeeting);
    }
    setDraft(undefined);
    if (onCreated) {
      onCreated(newMeeting);
    }
  };

  return (
    <div>
      {errors.length > 0 && (
        <div className="error">
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {draft && <MeetingForm meeting={draft} onSave={handleSave} />}
    </div>
  );
};

export const EditMeeting: FC<{ id: ID<Meeting> }> = ({ id }) => {
  const meeting = useCoState(Meeting, id);

  if (!meeting) {
    return null;
  }

  return <MeetingForm meeting={meeting} />;
};
