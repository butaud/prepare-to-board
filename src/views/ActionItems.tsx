import { useState } from "react";
import { SubHeader } from "../ui/SubHeader";
import { ActionItemRow } from "../ui/ActionItemRow";
import { useLoadedAccount } from "../hooks/Account";
import { extractActionItems, type ActionItemWithContext } from "../util/actionItems";
import "./ActionItems.css";

type Filter = "mine" | "all";

const sortItems = (items: ActionItemWithContext[]): ActionItemWithContext[] =>
  [...items].sort((a, b) => {
    const aDone = a.completedOn !== undefined;
    const bDone = b.completedOn !== undefined;
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (aDone && bDone) return (b.completedOn ?? 0) - (a.completedOn ?? 0);
    return a.dueDate - b.dueDate;
  });

export const ActionItems = () => {
  const me = useLoadedAccount();
  const [filter, setFilter] = useState<Filter>("mine");

  const org = me.root?.selectedOrganization;

  if (!org) {
    return (
      <div>
        <SubHeader />
        <p className="empty-state">
          Select an organization to see its action items.
        </p>
      </div>
    );
  }

  const myBoardMember = org.members.find((m) => m.accountId === me.id);
  const isOfficer = me.canWrite(org);
  const allItems = extractActionItems(org.meetings);

  const visibleItems =
    filter === "mine" && myBoardMember
      ? allItems.filter((item) => item.assignee?.id === myBoardMember.id)
      : allItems;

  const sorted = sortItems(visibleItems);
  const openItems = sorted.filter((item) => item.completedOn === undefined);
  const completedItems = sorted.filter((item) => item.completedOn !== undefined);

  const canToggle = (item: ActionItemWithContext) =>
    isOfficer || (item.assignee?.id !== undefined && item.assignee.id === myBoardMember?.id);

  return (
    <div className="action-items-page">
      <SubHeader />
      <div className="action-items-header">
        <h2>Action Items</h2>
        <div className="action-items-filter">
          <button
            className={filter === "mine" ? "btn-small" : "btn-small btn-secondary"}
            onClick={() => setFilter("mine")}
            disabled={!myBoardMember}
          >
            Assigned to me
          </button>
          <button
            className={filter === "all" ? "btn-small" : "btn-small btn-secondary"}
            onClick={() => setFilter("all")}
          >
            All
          </button>
        </div>
      </div>

      {sorted.length === 0 && (
        <p className="empty-state">
          {filter === "mine"
            ? "No action items are assigned to you."
            : "No action items recorded yet."}
        </p>
      )}

      {openItems.length > 0 && (
        <section className="action-items-section">
          <h3>Open ({openItems.length})</h3>
          {openItems.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              canToggle={canToggle(item)}
              canEdit={isOfficer}
              members={org.members}
              meetings={org.meetings}
            />
          ))}
        </section>
      )}

      {completedItems.length > 0 && (
        <section className="action-items-section">
          <h3>Completed ({completedItems.length})</h3>
          {completedItems.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              canToggle={canToggle(item)}
              canEdit={isOfficer}
              members={org.members}
              meetings={org.meetings}
            />
          ))}
        </section>
      )}
    </div>
  );
};
