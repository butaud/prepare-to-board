import { Account, co, CoList, CoMap, Group, Profile } from "jazz-tools";

export class Note extends CoMap {}

export class ListOfNotes extends CoList.Of(co.ref(Note)) {}

export class TextNote extends Note {
  text = co.string;
}

export class ListOfTextNotes extends CoList.Of(co.ref(TextNote)) {}

export class Topic extends CoMap {
  title = co.string;
  outcome = co.optional.string;
  durationMinutes = co.optional.number;
  plannedTopic = co.optional.ref(Topic);
  cancelled = co.optional.boolean;
}

export class ListOfTopics extends CoList.Of(co.ref(Topic)) {}

export class DraftTopic extends Topic {
  anchor = co.optional.ref(Topic);
  anchorIndex = co.optional.number;
}

export class ListOfDraftTopics extends CoList.Of(co.ref(DraftTopic)) {}

export class Minute extends CoMap {
  topic = co.ref(Topic);
  durationMinutes = co.number;
}

export class ListOfMinutes extends CoList.Of(co.ref(Minute)) {}

export class Meeting extends CoMap {
  date = co.Date;
  status = co.optional.literal("draft", "published", "live", "completed");
  plannedAgenda = co.ref(ListOfTopics);
  liveAgenda = co.ref(ListOfTopics);
  minutes = co.ref(ListOfMinutes);
}

export class ListOfMeetings extends CoList.Of(co.ref(Meeting)) {}

export class MeetingShadow extends CoMap {
  meeting = co.ref(Meeting);
  notes = co.ref(ListOfTextNotes);
  draftTopics = co.ref(ListOfDraftTopics);
}

export class ListOfMeetingShadows extends CoList.Of(co.ref(MeetingShadow)) {}

export class DraftMeeting extends CoMap {
  date = co.optional.Date;

  validate() {
    const errors: string[] = [];
    if (this.date === undefined) {
      errors.push("Date is required");
    }
    return errors;
  }
}

export class Organization extends CoMap {
  name = co.string;

  meetings = co.ref(ListOfMeetings);
}

export class DraftOrganization extends CoMap {
  name = co.optional.string;

  validate() {
    const errors: string[] = [];
    if (this.name === undefined || this.name === "") {
      errors.push("Name is required");
    }
    return errors;
  }
}

export class ListOfOrganizations extends CoList.Of(co.ref(Organization)) {}

export class UserAccountRoot extends CoMap {
  organizations = co.ref(ListOfOrganizations);
  selectedOrganization = co.optional.ref(Organization);
  meetingShadows = co.ref(ListOfMeetingShadows);
}

export class UserProfile extends Profile {
  title = co.string;

  get firstName() {
    return this.name.split(" ")[0];
  }

  get lastName() {
    return this.name.split(" ")[1];
  }

  get initials() {
    return this.firstName.charAt(0) + this.lastName.charAt(0);
  }

  get formalName() {
    return `${this.title} ${this.lastName}`;
  }

  migrate(this: UserProfile) {
    if (this.title === undefined || this.title === "") {
      this.title = "Mr.";
    }
  }
}

export class UserAccount extends Account {
  root = co.ref(UserAccountRoot);
  profile = co.ref(UserProfile);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async migrate(this: UserAccount, creationProps?: { name: string }) {
    if (this.root === undefined) {
      this.root = UserAccountRoot.create({
        selectedOrganization: undefined,
        organizations: ListOfOrganizations.create([]),
        meetingShadows: ListOfMeetingShadows.create([]),
      });
    } else {
      const { root } = await this.ensureLoaded({
        resolve: {
          root: {
            organizations: true,
            meetingShadows: true,
          },
        },
      });
      if (root.organizations === undefined) {
        root.organizations = ListOfOrganizations.create([]);
      }
      if (root.meetingShadows === undefined) {
        root.meetingShadows = ListOfMeetingShadows.create([]);
      }
    }

    if (this.profile === undefined) {
      const profileGroup = Group.create();
      profileGroup.addMember("everyone", "reader");

      this.profile = UserProfile.create(
        {
          name: creationProps?.name ?? "John Doe",
          title: "Mr.",
        },
        profileGroup
      );
    } else {
      const { profile } = await this.ensureLoaded({
        resolve: {
          profile: true,
        },
      });
      if (profile) {
        profile.migrate();
      }
    }
  }
}
