import { ReactNode } from "react";

import "./SubHeader.css";
import { Breadcrumbs } from "./Breadcrumbs";
import { useLocation, useNavigate } from "react-router-dom";

export type SubHeaderAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  danger?: boolean;
};

export type SubHeaderNavTab = {
  label: string;
  icon: ReactNode;
  destination: string;
  className?: string;
};

export type SubHeaderCallbackTab = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  isActive: boolean;
  className?: string;
};

export type SubHeaderTab = SubHeaderNavTab | SubHeaderCallbackTab;

export type SubHeaderProps = {
  dynamicTitleParts?: Record<string, string>;
  partsToIgnore?: string[];
  actions?: SubHeaderAction[];
  tabs?: SubHeaderTab[];
};

export const SubHeader = ({
  dynamicTitleParts,
  partsToIgnore,
  actions,
  tabs,
}: SubHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="sub-header">
      <div className="first-part">
        <Breadcrumbs
          dynamicTitleParts={dynamicTitleParts}
          partsToIgnore={partsToIgnore}
        />
        {tabs && tabs.length > 0 && (
          <div className="sub-header-tabs">
            {tabs.map((tab, index) => {
              const { onClick, isActive } = (() => {
                if ("onClick" in tab) {
                  return { onClick: tab.onClick, isActive: tab.isActive };
                } else {
                  return {
                    onClick: () => navigate(tab.destination),
                    isActive: location.pathname === tab.destination,
                  };
                }
              })();

              return (
                <button
                  key={index}
                  onClick={onClick}
                  disabled={isActive}
                  title={tab.label}
                  className={tab.className}
                >
                  {tab.icon}
                  <span className="tab-label"> {tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className="sub-header-actions">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={action.danger ? "danger" : ""}
              disabled={action.disabled}
              title={action.label}
            >
              {action.icon}
              <span className="action-label"> {action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
