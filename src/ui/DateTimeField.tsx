import { FC, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { TimeOfDayInput } from "./TimeOfDayInput";

import "react-datepicker/dist/react-datepicker.css";
import "./DateTimeField.css";

export type DateTimeFieldProps = {
  selected: Date;
  onChange: (date: Date) => void;
  dateFormat?: string;
  autoFocus?: boolean;
  portalId?: string;
};

// A date picker and a time input side by side instead of one combined
// react-datepicker popup - splitting them out fixes two things at once:
// react-datepicker deliberately leaves the popup open after a date is
// picked whenever showTimeSelect is on (so there's time to also pick a
// time before it closes), and its time list is a slow scroll through
// 5-minute increments. A plain date picker closes the instant a day is
// clicked, and the native time input is a fast, platform-native way to
// set the time - see TimeOfDayInput.
export const DateTimeField: FC<DateTimeFieldProps> = ({
  selected,
  onChange,
  dateFormat = "MMMM d, yyyy",
  autoFocus,
  portalId,
}) => {
  // Managed explicitly rather than left to react-datepicker's own
  // close-on-select handling, which doesn't reliably close the popup.
  const [isOpen, setIsOpen] = useState(false);
  // When a day is clicked, the browser moves DOM focus back to the text
  // input as soon as the clicked day cell unmounts (since it's no longer
  // in the DOM to hold focus) - and, at least under CDP-driven clicks,
  // that refocus is immediately followed by a genuine click event on the
  // input itself, which would otherwise reopen the popup we just closed.
  // Ignoring input-clicks that land within this window of a selection
  // filters that out while still responding to any real, intentional
  // re-click (which lands well after the browser's own refocus does).
  const lastSelectedAtRef = useRef(0);

  const handleDateChange = (picked: Date | null) => {
    setIsOpen(false);
    lastSelectedAtRef.current = Date.now();
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
      <DatePicker
        selected={selected}
        onChange={handleDateChange}
        dateFormat={dateFormat}
        autoFocus={autoFocus}
        open={isOpen}
        onInputClick={() => {
          if (Date.now() - lastSelectedAtRef.current < 250) return;
          setIsOpen(true);
        }}
        onClickOutside={() => setIsOpen(false)}
        popperProps={{ placement: "bottom", strategy: "fixed" }}
        portalId={portalId}
      />
      <TimeOfDayInput
        selected={selected}
        onChange={handleTimeChange}
        aria-label="Time"
      />
    </span>
  );
};
