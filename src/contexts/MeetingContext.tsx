import { createContext, useContext } from "react";
import { Meeting } from "../schema";

// Create the context
export const MeetingContext = createContext<Meeting | undefined>(undefined);

// Custom hook to use the MeetingContext
export const useMeeting = (): Meeting | undefined => {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error("useMeeting must be used within a MeetingProvider");
  }
  return context;
};
