import { FC } from "react";
import { Link, useLocation } from "react-router-dom";

import "./Breadcrumbs.css";

export type BreadcrumbsProps = {
  dynamicTitleParts?: Record<string, string>;
  partsToIgnore?: string[];
};

const constantTitles: Record<string, string> = {
  "/": "Home",
  meetings: "Meetings",
  "action-items": "Action Items",
  calendar: "Calendar",
  settings: "Settings",
  manage: "Manage",
  members: "Members",
  present: "Present",
  minutes: "Minutes",
};

export const Breadcrumbs: FC<BreadcrumbsProps> = ({
  dynamicTitleParts,
  partsToIgnore,
}) => {
  const location = useLocation();
  const parts = location.pathname
    .split("/")
    .filter((part) => part !== "" && !partsToIgnore?.includes(part));
  return (
    <h5 className="breadcrumbs">
      {parts.map((part, index) => {
        const path = `/${parts.slice(0, index + 1).join("/")}`;
        const title = dynamicTitleParts?.[part] ?? constantTitles[part] ?? part;
        return (
          <span key={path}>
            {index > 0 && " | "}
            {index == parts.length - 1 ? title : <Link to={path}>{title}</Link>}
          </span>
        );
      })}
    </h5>
  );
};
