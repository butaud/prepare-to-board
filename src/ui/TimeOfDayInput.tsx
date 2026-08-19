import { FC } from "react";

export type TimeOfDayInputProps = {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  id?: string;
  className?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
};

const toTimeInputValue = (date: Date | null): string => {
  if (!date) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// A native time input rather than a scrollable list of 5/15-minute
// intervals - platform-native (a fast segmented HH:MM AM/PM entry on
// desktop, a wheel picker on mobile), fully keyboard/screen-reader
// accessible for free, and zero added dependency weight. Takes/returns a
// Date (only its hours/minutes are meaningful) so it drops straight into
// call sites that previously used react-datepicker's showTimeSelectOnly.
export const TimeOfDayInput: FC<TimeOfDayInputProps> = ({
  selected,
  onChange,
  id,
  className,
  autoFocus,
  "aria-label": ariaLabel,
}) => (
  <input
    type="time"
    id={id}
    className={className}
    autoFocus={autoFocus}
    aria-label={ariaLabel}
    value={toTimeInputValue(selected)}
    onChange={(e) => {
      const value = e.target.value;
      if (!value) {
        onChange(null);
        return;
      }
      const [hours, minutes] = value.split(":").map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
      const next = new Date(selected ?? new Date());
      next.setHours(hours, minutes, 0, 0);
      onChange(next);
    }}
  />
);
