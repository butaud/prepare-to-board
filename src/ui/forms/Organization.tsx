import { FC, useState } from "react";
import { useMutation } from "convex/react";
import {
  DraftOrganization,
  Organization,
  validateDraftOrganization,
} from "../../schema";
import { api } from "../../convexClient";

import "./Organization.css";
import { useLoadedAccount } from "../../hooks/Account";

type OrganizationFormProps = {
  organization: Organization | DraftOrganization;
  onSave?: (name: string) => void;
  onCancel?: () => void;
};
const OrganizationForm: FC<OrganizationFormProps> = ({
  organization,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(organization.name ?? "");
  return (
    <form
      className="organization"
      onSubmit={(event) => {
        event.preventDefault();
        onSave?.(name);
      }}
    >
      <div>
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
  useLoadedAccount();
  const createOrganization = useMutation(api.app.createOrganization);
  const [draft, setDraft] = useState<DraftOrganization>({});
  const [errors, setErrors] = useState<string[]>([]);

  const handleSave = (name: string) => {
    const nextDraft = { name };
    const validationErrors = validateDraftOrganization(nextDraft);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    void createOrganization({ name }).then(() => {
      setDraft({});
      onDoneCreating?.();
    });
  };

  const handleCancel = () => {
    setDraft({});
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
      <OrganizationForm
        organization={draft}
        onSave={handleSave}
        onCancel={onDoneCreating ? handleCancel : undefined}
      />
    </div>
  );
};

export const EditOrganization: FC<{ organization: Organization }> = ({
  organization,
}) => {
  const updateOrganization = useMutation(api.app.updateOrganization);

  return (
    <OrganizationForm
      organization={organization}
      onSave={(name) =>
        void updateOrganization({ organizationId: organization.id, name })
      }
    />
  );
};
