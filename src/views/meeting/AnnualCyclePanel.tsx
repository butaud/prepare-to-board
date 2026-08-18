import { useState } from "react";
import { LuRepeat } from "react-icons/lu";
import { CalendarItem, Organization } from "../../schema";
import { isCalendarItemCompleted, monthsWithinContext, MONTH_NAMES } from "../../util/calendarItems";

import "./AnnualCyclePanel.css";

const DEFAULT_CALENDAR_CONTEXT_MONTHS = 2;

export type AnnualCyclePanelProps = {
  organization: Organization;
  /** The meeting date the "nearby months" window is centered on. */
  referenceDate: Date;
};

// A collapsible reminder of the org's recurring annual-cycle items due
// around this meeting's month, so officers can fold them into the agenda
// without leaving the editor - see GH issue #53.
export const AnnualCyclePanel = ({ organization, referenceDate }: AnnualCyclePanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const contextMonths = organization.calendarContextMonths ?? DEFAULT_CALENDAR_CONTEXT_MONTHS;
  const months = monthsWithinContext(referenceDate, contextMonths);

  const itemsByMonth = new Map<number, CalendarItem[]>();
  organization.calendarItems.forEach((item) => {
    const existing = itemsByMonth.get(item.month) ?? [];
    existing.push(item);
    itemsByMonth.set(item.month, existing);
  });
  const monthEntries = months
    .map((month) => ({ month, items: itemsByMonth.get(month) ?? [] }))
    .filter((entry) => entry.items.length > 0);

  if (!isOpen) {
    return (
      <aside className="annual-cycle-panel">
        <button
          className="annual-cycle-panel-toggle"
          onClick={() => setIsOpen(true)}
          aria-expanded={false}
          aria-controls="annual-cycle-panel-content"
          title="Annual Cycle"
        >
          <LuRepeat aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="annual-cycle-panel is-open">
      <div className="annual-cycle-panel-content" id="annual-cycle-panel-content">
        <div className="annual-cycle-panel-header">
          <h3>Annual Cycle</h3>
          <button
            className="annual-cycle-panel-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close annual cycle panel"
          >
            &times;
          </button>
        </div>
        {monthEntries.length === 0 ? (
          <p className="minutes-hint">No recurring items near this month.</p>
        ) : (
          monthEntries.map(({ month, items }) => (
            <div key={month} className="annual-cycle-panel-month">
              <h4>{MONTH_NAMES[month - 1]}</h4>
              <ul>
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={
                      isCalendarItemCompleted(item.completedOn, referenceDate)
                        ? "is-completed"
                        : undefined
                    }
                  >
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
