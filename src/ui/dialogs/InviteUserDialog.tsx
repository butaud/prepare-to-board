import { FC, useMemo } from "react";
import { Dialog } from "./Dialog";
import { createInviteLink } from "jazz-tools/react";
import { Organization } from "../../schema";

import "./InviteUserDialog.css";

export type InviteUserDialogProps = {
  closeDialog: () => void;
  organization: Organization;
};

export const InviteUserDialog: FC<InviteUserDialogProps> = ({
  closeDialog,
  organization,
}) => {
  const inviteLink = useMemo(() => {
    const managePathIndex = window.location.href.lastIndexOf("/manage");
    const urlWithoutManagePath =
      window.location.href.slice(0, managePathIndex) + "/invite";
    return createInviteLink(organization, "reader", {
      baseURL: urlWithoutManagePath,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id]);
  return (
    <Dialog
      title="Invite new users"
      closeDialog={closeDialog}
      className="invite-users"
    >
      <p>
        Share this link with the user you want to invite. They will be able to
        join your organization. If you need to change their role you can do so
        after they join.
      </p>
      <input
        type="text"
        value={inviteLink}
        readOnly
        onFocus={(e) => e.target.select()}
        aria-label="Invite link"
      />
    </Dialog>
  );
};
