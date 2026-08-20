import { useState } from "react";
import { useMutation } from "convex/react";
import { CalendarItem, Organization } from "../schema";
import { SlPlus, SlPencil, SlTrash } from "react-icons/sl";
import { useLoadedAccount } from "../hooks/Account";
import { SubHeader } from "../ui/SubHeader";
import { api } from "../convexClient";
import { isCalendarItemCompleted, MONTH_NAMES, orderMonthsFrom } from "../util/calendarItems";

import "./Manage.css";
import "./AnnualCycle.css";

const CalendarItemRow = ({
  item,
  canEdit,
  canToggleCompletion,
}: {
  item: CalendarItem;
  /** Add/edit text/delete - a structural change to the recurring checklist. */
  canEdit: boolean;
  /** Checking an item off for this cycle - a routine operational task. */
  canToggleCompletion: boolean;
}) => {
  const updateCalendarItem = useMutation(api.app.updateCalendarItem);
  const deleteCalendarItem = useMutation(api.app.deleteCalendarItem);
  const setCalendarItemCompletedOn = useMutation(api.app.setCalendarItemCompletedOn);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const isCompleted = isCalendarItemCompleted(item.completedOn);

  if (editing) {
    return (
      <li className="calendar-item">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          style={{ width: "100%" }}
        />
        <button
          className="btn-small btn-primary"
          onClick={() => {
            if (!text.trim()) return;
            void updateCalendarItem({
              calendarItemId: item.id,
              text: text.trim(),
            }).then(() => setEditing(false));
          }}
        >
          Save
        </button>
        <button
          className="btn-small btn-secondary"
          onClick={() => {
            setText(item.text);
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </li>
    );
  }

  return (
    <li className={`calendar-item${isCompleted ? " is-completed" : ""}`}>
      <label className="calendar-item-checkbox">
        <input
          type="checkbox"
          checked={isCompleted}
          disabled={!canToggleCompletion}
          onChange={(e) =>
            void setCalendarItemCompletedOn({
              calendarItemId: item.id,
              completedOn: e.target.checked ? Date.now() : undefined,
            })
          }
        />
        <span>{item.text}</span>
      </label>
      {canEdit && (
        <span className="calendar-item-actions">
          <button
            className="btn-small btn-secondary"
            onClick={() => setEditing(true)}
            title="Edit"
          >
            <SlPencil />
          </button>
          <button
            className="btn-small btn-secondary"
            onClick={() => void deleteCalendarItem({ calendarItemId: item.id })}
            title="Delete"
          >
            <SlTrash />
          </button>
        </span>
      )}
    </li>
  );
};

const AddCalendarItemForm = ({ org }: { org: Organization }) => {
  const addCalendarItem = useMutation(api.app.addCalendarItem);
  const [text, setText] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [showing, setShowing] = useState(false);

  const handleAdd = () => {
    if (!text.trim()) return;
    void addCalendarItem({
      organizationId: org.id,
      month,
      text: text.trim(),
    }).then(() => {
      setText("");
      setShowing(false);
    });
  };

  if (!showing) {
    return (
      <button onClick={() => setShowing(true)}>
        <SlPlus /> Add calendar item
      </button>
    );
  }

  return (
    <div className="add-calendar-item-form">
      <select
        aria-label="Month"
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
      >
        {MONTH_NAMES.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>
      <input
        placeholder="Recurring item *"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <button onClick={handleAdd} disabled={!text.trim()}>
        Add
      </button>
      <button onClick={() => setShowing(false)}>Cancel</button>
    </div>
  );
};

const DEFAULT_CALENDAR_CONTEXT_MONTHS = 2;

const CalendarContextMonthsField = ({ org }: { org: Organization }) => {
  const updateCalendarContextMonths = useMutation(api.app.updateCalendarContextMonths);
  const [editing, setEditing] = useState(false);
  const [months, setMonths] = useState(
    String(org.calendarContextMonths ?? DEFAULT_CALENDAR_CONTEXT_MONTHS)
  );

  if (editing) {
    return (
      <div className="committee-doc-url-field">
        <input
          type="number"
          min={0}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          autoFocus
          style={{ width: 80 }}
        />
        <button
          className="btn-small btn-primary"
          onClick={() => {
            const parsed = Number(months);
            void updateCalendarContextMonths({
              organizationId: org.id,
              calendarContextMonths: Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined,
            }).then(() => setEditing(false));
          }}
        >
          Save
        </button>
        <button
          className="btn-small btn-secondary"
          onClick={() => {
            setMonths(String(org.calendarContextMonths ?? DEFAULT_CALENDAR_CONTEXT_MONTHS));
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="committee-doc-url-field">
      <span className="manage-note">
        Months of calendar context in exported minutes (trailing/upcoming):{" "}
        {org.calendarContextMonths ?? DEFAULT_CALENDAR_CONTEXT_MONTHS}
      </span>
      <button className="btn-small btn-secondary" onClick={() => setEditing(true)} title="Edit">
        <SlPencil />
      </button>
    </div>
  );
};

const DEFAULT_BOARD_YEAR_START_MONTH = 1;

const BoardYearStartMonthField = ({ org }: { org: Organization }) => {
  const updateBoardYearStartMonth = useMutation(api.app.updateBoardYearStartMonth);
  const [editing, setEditing] = useState(false);
  const startMonth = org.boardYearStartMonth ?? DEFAULT_BOARD_YEAR_START_MONTH;
  const [selected, setSelected] = useState(startMonth);

  if (editing) {
    return (
      <div className="committee-doc-url-field">
        <select
          aria-label="First month of the board year"
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          autoFocus
        >
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
        <button
          className="btn-small btn-primary"
          onClick={() =>
            void updateBoardYearStartMonth({
              organizationId: org.id,
              boardYearStartMonth: selected,
            }).then(() => setEditing(false))
          }
        >
          Save
        </button>
        <button
          className="btn-small btn-secondary"
          onClick={() => {
            setSelected(startMonth);
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="committee-doc-url-field">
      <span className="manage-note">
        First month of the board year: {MONTH_NAMES[startMonth - 1]}
      </span>
      <button className="btn-small btn-secondary" onClick={() => setEditing(true)} title="Edit">
        <SlPencil />
      </button>
    </div>
  );
};

export const AnnualCycle = () => {
  const me = useLoadedAccount();
  const org = me.root?.selectedOrganization;

  if (!org) {
    return (
      <div>
        <SubHeader />
        <p className="empty-state">Select an organization to see its annual cycle.</p>
      </div>
    );
  }

  const isAdmin = me.canAdmin(org);
  const isOfficer = me.canWrite(org);
  const canToggleCompletion = isAdmin || isOfficer;

  const itemsByMonth = new Map<number, CalendarItem[]>();
  org.calendarItems.forEach((item) => {
    const existing = itemsByMonth.get(item.month) ?? [];
    existing.push(item);
    itemsByMonth.set(item.month, existing);
  });
  const monthOrder = orderMonthsFrom(org.boardYearStartMonth ?? DEFAULT_BOARD_YEAR_START_MONTH);

  return (
    <div className="manage annual-cycle">
      <SubHeader />
      <div className="manage-section">
        {isAdmin && (
          <>
            <CalendarContextMonthsField org={org} />
            <BoardYearStartMonthField org={org} />
          </>
        )}
        {org.calendarItems.length === 0 ? (
          <p className="manage-note">No recurring calendar items yet.</p>
        ) : (
          monthOrder.map((month) => {
            const items = itemsByMonth.get(month);
            if (!items || items.length === 0) return null;
            return (
              <div key={month} className="calendar-month-group">
                <h4>{MONTH_NAMES[month - 1]}</h4>
                <ul className="calendar-item-list">
                  {items.map((item) => (
                    <CalendarItemRow
                      key={item.id}
                      item={item}
                      canEdit={isAdmin}
                      canToggleCompletion={canToggleCompletion}
                    />
                  ))}
                </ul>
              </div>
            );
          })
        )}
        {isAdmin && (
          <div className="manage-actions">
            <AddCalendarItemForm org={org} />
          </div>
        )}
      </div>
    </div>
  );
};
