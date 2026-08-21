import { Meeting } from "../../schema";
import { CloneMeeting } from "../forms/CloneMeeting";
import { Dialog } from "./Dialog";

export type CloneMeetingDialogProps = {
  meeting: Meeting;
  closeDialog: () => void;
};

export const CloneMeetingDialog = ({
  meeting,
  closeDialog,
}: CloneMeetingDialogProps) => {
  return (
    <Dialog
      title="Clone Meeting"
      closeDialog={closeDialog}
      className="create-meeting"
    >
      <CloneMeeting meeting={meeting} onCreated={closeDialog} />
    </Dialog>
  );
};
