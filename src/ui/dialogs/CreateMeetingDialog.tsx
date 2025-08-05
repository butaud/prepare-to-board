import { CreateMeeting } from "../forms/Meeting";
import { Dialog } from "./Dialog";

export type CreateMeetingDialogProps = {
  closeDialog: () => void;
  defaultDate?: Date | null;
};

export const CreateMeetingDialog = ({
  closeDialog,
  defaultDate = null,
}: CreateMeetingDialogProps) => {
  return (
    <Dialog
      title="Create Meeting"
      closeDialog={closeDialog}
      className="create-meeting"
    >
      <CreateMeeting onCreated={closeDialog} defaultDate={defaultDate} />
    </Dialog>
  );
};
