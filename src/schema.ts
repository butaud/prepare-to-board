import { Account, co, CoList, CoMap, Group, Profile } from "jazz-tools";    

export class Meeting extends CoMap {
    date = co.Date;
}

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

export class ListOfMeetings extends CoList.Of(co.ref(Meeting)) {}

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

    async migrate(this: UserProfile) {
        if (this.title === undefined || this.title === "") {
            this.title = "Mr.";
        }
    }
}

export class UserAccount extends Account {
    root = co.ref(UserAccountRoot);
    profile = co.ref(UserProfile);

    async migrate(this: UserAccount, creationProps?: { name: string }) {
        if (this.root === undefined) {
            this.root = UserAccountRoot.create({
                organizations: ListOfOrganizations.create([]
                ), 
            })
        }

        if (this.profile === undefined) {
            const profileGroup = Group.create();
            profileGroup.addMember("everyone", "reader");

            this.profile = UserProfile.create({
                name: creationProps?.name ?? "John Doe",
                title: "Mr.",
            }, profileGroup);
        } else {
            const { profile } = await this.ensureLoaded({
                profile: {}
            });
            if (profile) {
                await profile.migrate();
            }
        }
    }
}