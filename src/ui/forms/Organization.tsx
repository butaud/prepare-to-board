import { FC, useEffect, useState } from "react";
import {
  Schema,
  DraftOrganization,
  Organization,
  validateDraftOrganization,
} from "../../schema";
import { useCoState } from "jazz-tools/react";
import { Group, ID } from "jazz-tools";

import "./Organization.css";
import { useLoadedAccount } from "../../hooks/Account";

type OrganizationFormProps = {
  organization: Organization | DraftOrganization;
  onSave?: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
};
const OrganizationForm: FC<OrganizationFormProps> = ({
  organization,
  onSave,
  onCancel,
}) => {
  return (
    <form className="organization" onSubmit={onSave}>
      <div>
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          value={organization.name}
          onChange={(e) => (organization.name = e.target.value)}
          required
        />
      </div>
      {onSave && <button type="submit">Save</button>}
      {onCancel && (
        <button type="button" onClick={onCancel} className="cancel-button">
          Cancel
        </button>
      )}
    </form>
  );
};

export type CreateOrganizationProps = {
  onDoneCreating?: () => void;
};
export const CreateOrganization: FC<CreateOrganizationProps> = ({
  onDoneCreating,
}) => {
  const me = useLoadedAccount();
  const [draft, setDraft] = useState<DraftOrganization>();
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setDraft(Schema.DraftOrganization.create({}));
  }, [me?.id]);

  if (!me) {
    return null;
  }

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft) return;
    const validationErrors = validateDraftOrganization(draft);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);

    const organizationGroup = Group.create();
    const newOrganization = Schema.Organization.create(
      {
        name: draft.name!,
        meetings: Schema.ListOfMeetings.create([], organizationGroup),
      },
      organizationGroup
    );

    if (me) {
      me.root.organizations.push(newOrganization);
      me.root.selectedOrganization = newOrganization;
    }
    setDraft(undefined);
    onDoneCreating?.();
  };

  const handleCancel = () => {
    setDraft(undefined);
    setErrors([]);
    onDoneCreating?.();
  };

  return (
    <div>
      {errors.length > 0 && (
        <div className="error">
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {draft && (
        <OrganizationForm
          organization={draft}
          onSave={handleSave}
          onCancel={onDoneCreating ? handleCancel : undefined}
        />
      )}
    </div>
  );
};

export const EditOrganization: FC<{ id: ID<Organization> }> = ({ id }) => {
  const organization = useCoState(Schema.Organization, id);

  if (!organization) {
    return null;
  }

  return <OrganizationForm organization={organization} />;
};
