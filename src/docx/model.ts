// Local re-statement of the parts of butaud/minutes-taker's `minutes-model`
// package that doc.ts/style.ts depend on, so exportSessionToDocx can be
// ported without pulling in that whole app. Kept deliberately identical in
// shape to make future upstream comparisons easy, with two intentional
// deviations noted inline where our data model can't fill them exactly.

export type Session = {
  metadata: SessionMetadata;
  calendar: Calendar;
  topics: Topic[];
  committees: Committee[];
  pastActionItems: PastActionItem[];
};

export type SessionMetadata = {
  membersPresent: Person[];
  membersAbsent: Person[];
  administrationPresent: Person[];
  location: string;
  startTime: Date;
  organization: string;
  title: string;
  subtitle: string;
  caller?: Caller;
  committeeDocUrl?: string;
};

// Deviation: minutes-taker fixes this to "Board" | "Headmaster" (its own
// school-board-specific committee types). prepare-to-board isn't
// school-specific, so committee type is free text instead.
export type Committee = {
  name: string;
  type: string;
};

export type PastActionItem = {
  text: string;
  assignee: Person;
  dueDate: Date;
  completed: boolean;
};

export type CalendarMonth =
  | "January"
  | "February"
  | "March"
  | "April"
  | "May"
  | "June"
  | "July"
  | "August"
  | "September"
  | "October"
  | "November"
  | "December";

export type Calendar = CalendarMonthEntry[];

export type CalendarMonthEntry = {
  month: CalendarMonth;
  items: CalendarItem[];
};

export type CalendarItem = {
  text: string;
  completed: boolean;
};

// minutes-taker's Person is { title: "Mr."|"Mrs."|"Miss", firstName, lastName }.
// prepare-to-board's BoardMember only has a single `name` string, so we
// deviate here: title/firstName are always "" and the full name goes in
// lastName. See mapMeetingToSession.ts for the mapping and PR notes for the
// known cosmetic effect (speaker references read as the full name rather
// than an honorific + last name).
export type Person = {
  title: string;
  firstName: string;
  lastName: string;
};

export type Caller = {
  person: Person;
  role: string;
};

export type Topic = {
  title: string;
  notes: Note[];
  startTime: Date;
  durationMinutes?: number;
  leader?: Person;
};

export type Note = TextNote | ActionItemNote | MotionNote;

export type TextNote = {
  type: "text";
  text: string;
};

export type ActionItemNote = {
  type: "actionItem";
  text: string;
  assignee: Person;
  dueDate: Date;
  // Deviation: not present in minutes-taker's ActionItemNote (which only
  // tracks completion via the separate PastActionItem list). We do track
  // completion per-item, so it's carried through here to get accurate
  // "(Done)" markers in the listed action items section.
  completed?: boolean;
};

export type MotionNote = {
  type: "motion";
  text: string;
  mover: Person;
  // Deviation: minutes-taker requires a seconder; prepare-to-board's motion
  // form treats it as optional, so this stays optional here too. doc.ts's
  // seconder paragraph is skipped when absent.
  seconder?: Person;
  inFavorCount?: number;
  opposedCount?: number;
  abstainedCount?: number;
  outcome: "passed" | "failed" | "tabled" | "withdrawn" | "active";
};
