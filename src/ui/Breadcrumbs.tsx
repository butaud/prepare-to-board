import { FC } from "react";
import { Link, useLocation } from "react-router-dom";

import "./Breadcrumbs.css";

export type BreadcrumbsProps = {
  dynamicTitle?: string;
};

const constantTitles: Record<string, string> = {
  "/": "Home",
  "/meetings": "Meetings",
  "/action-items": "Action Items",
  "/calendar": "Annual Calendar",
  "/settings": "Settings",
  "/manage": "Manage",
};

export const Breadcrumbs: FC<BreadcrumbsProps> = ({ dynamicTitle }) => {
  const location = useLocation();
  const parts = location.pathname.split("/").filter((part) => part !== "");
  return (
    <div className="breadcrumbs">
      {parts.map((part, index) => {
        const path = `/${parts.slice(0, index + 1).join("/")}`;
        const title = constantTitles[path] ?? part;
        return (
          <span key={path}>
            {index > 0 && " | "}
            {index == parts.length - 1 ? (
              dynamicTitle ?? title
            ) : (
              <Link to={path}>{title}</Link>
            )}
          </span>
        );
      })}
    </div>
  );
};
