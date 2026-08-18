import { createContext, useContext } from "react";

export type PlanAgendaEditModeContextValue = {
  isEditingAgenda: boolean;
};

export const PlanAgendaEditModeContext = createContext<
  PlanAgendaEditModeContextValue | undefined
>(undefined);

export const usePlanAgendaEditMode = () => {
  const context = useContext(PlanAgendaEditModeContext);
  if (context === undefined) {
    throw new Error(
      "usePlanAgendaEditMode must be used within a PlanAgendaEditModeContext provider"
    );
  }
  return context;
};
