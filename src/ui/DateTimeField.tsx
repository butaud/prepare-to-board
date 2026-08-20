import { FC } from "react";
import { DateOnlyInput } from "./DateOnlyInput";
import { TimeOfDayInput } from "./TimeOfDayInput";

import "./DateTimeField.css";

export type DateTimeFieldProps = {
  selected: Date;
  onChange: (date: Date) => void;
  autoFocus?: boolean;
};

// A date input and a time input side by side rather than one combined
// react-datepicker popup with showTimeSelect - both are native inputs
// (see DateOnlyInput and TimeOfDayInput), so there's no popup open/close
// state to manage at all.
export const DateTimeField: FC<DateTimeFieldProps> = ({
  selected,
  onChange,
  autoFocus,
}) => {
  const handleDateChange = (picked: Date | null) => {
    if (!picked) return;
    const next = new Date(picked);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
  };

  const handleTimeChange = (picked: Date | null) => {
    if (!picked) return;
    const next = new Date(selected);
    next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    onChange(next);
  };

  return (
    <span className="datetime-field">
      <DateOnlyInput
        selected={selected}
        onChange={handleDateChange}
        autoFocus={autoFocus}
        aria-label="Date"
      />
      <TimeOfDayInput
        selected={selected}
        onChange={handleTimeChange}
        aria-label="Time"
      />
    </span>
  );
};
