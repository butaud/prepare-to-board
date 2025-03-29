import { CreateMeeting } from "../forms/Meeting";
import { Dialog } from "./Dialog";

export type CreateMeetingDialogProps = {
  closeDialog: () => void;
};

export const CreateMeetingDialog = ({
  closeDialog,
}: CreateMeetingDialogProps) => {
  return (
    <Dialog
      title="Create Meeting"
      closeDialog={closeDialog}
      className="create-meeting"
    >
      <CreateMeeting onCreated={closeDialog} />
    </Dialog>
  );
};
