import { createContext, useContext } from "react";

export type MinutesEditModeContextValue = {
  isEditingMinutes: boolean;
};

export const MinutesEditModeContext = createContext<
  MinutesEditModeContextValue | undefined
>(undefined);

export const useMinutesEditMode = () => {
  const context = useContext(MinutesEditModeContext);
  if (context === undefined) {
    throw new Error(
      "useMinutesEditMode must be used within a MinutesEditModeContext provider"
    );
  }
  return context;
};
