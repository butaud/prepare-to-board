import { FC, useEffect, useState } from "react";
import { DraftOrganization, ListOfMeetings, Organization } from "../../schema";
import { useAccount } from "jazz-react";

type OrganizationFormProps = {
  organization: Organization | DraftOrganization;
  onSave?: (e: React.FormEvent<HTMLFormElement>) => void;
};
const OrganizationForm: FC<OrganizationFormProps> = ({
  organization,
  onSave,
}) => {
  return (
    <form onSubmit={onSave}>
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
    </form>
  );
};

export const CreateOrganization = () => {
  const { me } = useAccount({
    root: {
      selectedOrganization: {},
      organizations: [{}],
    },
  });
  const [draft, setDraft] = useState<DraftOrganization>();
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setDraft(DraftOrganization.create({}));
  }, [me?.id]);

  if (!me) {
    return null;
  }

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft) return;
    const validationErrors = draft.validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);

    const newOrganization = Organization.create({
      name: draft.name!,
      meetings: ListOfMeetings.create([]),
    });

    if (me) {
      me.root.organizations.push(newOrganization);
      me.root.selectedOrganization = newOrganization;
    }
    setDraft(undefined);
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
      {draft && <OrganizationForm organization={draft} onSave={handleSave} />}
    </div>
  );
};
