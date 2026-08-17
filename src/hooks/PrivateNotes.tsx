import { useMutation, useQuery } from "convex/react";
import { api } from "../convexClient";
import { Id } from "../schema";

type ServerPrivateNote = { topicId: string; text: string; updatedAt: number };

export const usePrivateNotes = (meetingId: Id) => {
  const notes = useQuery(api.app.privateNotesForMeeting, { meetingId }) as
    | ServerPrivateNote[]
    | undefined;
  const save = useMutation(api.app.savePrivateNote);

  const textByTopicId = new Map((notes ?? []).map((n) => [n.topicId, n.text]));

  return {
    isLoading: notes === undefined,
    getNote: (topicId: string) => textByTopicId.get(topicId) ?? "",
    saveNote: (topicId: string, text: string) =>
      save({ meetingId, topicId, text }),
  };
};
