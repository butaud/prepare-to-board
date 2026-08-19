import { FC } from "react";

export type DateOnlyInputProps = {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  id?: string;
  className?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
};

const toDateInputValue = (date: Date | null): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// A native date input rather than react-datepicker's calendar popup -
// platform-native (a calendar/wheel picker with zero popup-state to
// manage), fully keyboard/screen-reader accessible for free, and zero
// added dependency weight. Notably, it also sidesteps the open/close
// state bugs a controlled react-datepicker popup requires working
// around (see DateTimeField's git history). Returns the picked date at
// local midnight, mirroring what react-datepicker handed back, so it
// drops straight into call sites that merge in a time-of-day themselves.
export const DateOnlyInput: FC<DateOnlyInputProps> = ({
  selected,
  onChange,
  id,
  className,
  autoFocus,
  "aria-label": ariaLabel,
}) => (
  <input
    type="date"
    id={id}
    className={className}
    autoFocus={autoFocus}
    aria-label={ariaLabel}
    value={toDateInputValue(selected)}
    onChange={(e) => {
      const value = e.target.value;
      if (!value) {
        onChange(null);
        return;
      }
      const [year, month, day] = value.split("-").map(Number);
      if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return;
      onChange(new Date(year, month - 1, day));
    }}
  />
);
