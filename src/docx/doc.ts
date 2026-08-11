// Ported from butaud/minutes-taker's src/fs/doc.ts. Structure, styles, and
// wording are kept as close to the original as possible so the exported
// document looks like minutes-taker's output. Deviations from the original
// (all driven by real differences in our data model, not stylistic choices):
//   - No LinkNote support: prepare-to-board doesn't have a link note type.
//   - makeSeconderParagraph is skipped when a motion has no seconder, since
//     our motion form treats the seconder as optional.
//   - makeCallToOrderParagraph and the Session type both tolerate a meeting
//     with zero recorded topics (the original assumes at least one).
//   - Person only ever has a lastName (the full name) and an empty
//     title/firstName - see model.ts for why.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from "docx";
import {
  ActionItemNote,
  Calendar,
  CalendarMonthEntry,
  Committee,
  MotionNote,
  PastActionItem,
  Person,
  Session,
  SessionMetadata,
  TextNote,
  Topic,
} from "./model";
import {
  CalendarCellMargins,
  Styles,
  TopicHeaderCellMargins,
  TopicHeaderCellShading,
} from "./style";

const isTextNote = (note: Topic["notes"][number]): note is TextNote => note.type === "text";
const isActionItemNote = (note: Topic["notes"][number]): note is ActionItemNote =>
  note.type === "actionItem";

const makeSpeakerReference = (person: Person): TextRun => {
  return new TextRun({
    text: [person.title, person.lastName].filter(Boolean).join(" "),
    style: "SpeakerReference",
  });
};

const sessionHeader = (metadata: SessionMetadata): Paragraph[] => {
  const titleLine = `${metadata.title} - ${metadata.subtitle}: ${
    metadata.location
  }, ${metadata.startTime.toLocaleDateString(undefined, { timeZone: "UTC" })}`;
  return [
    new Paragraph({
      children: [new TextRun(metadata.organization)],
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [new TextRun({ text: titleLine, bold: true })],
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Minutes: ", bold: true }),
        new TextRun({ text: "DRAFT", style: "MinuteStateDraft" }),
      ],
      heading: HeadingLevel.HEADING_2,
    }),
  ];
};

const makeAttendanceLine = (name: string, people: Person[]): Paragraph => {
  return new Paragraph({
    children: [
      new TextRun({ text: `${name}: `, bold: true }),
      new TextRun(people.map((p) => p.lastName).join(", ")),
    ],
  });
};

const attendanceSection = (metadata: SessionMetadata): Paragraph[] => {
  return [
    makeAttendanceLine("Members in attendance", metadata.membersPresent),
    makeAttendanceLine("Members absent", metadata.membersAbsent),
    makeAttendanceLine("Administration", metadata.administrationPresent),
  ];
};

const makeMonthTableRow = (monthEntry: CalendarMonthEntry): TableRow => {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph(monthEntry.month)],
        width: {
          size: 15,
          type: WidthType.PERCENTAGE,
        },
        margins: CalendarCellMargins,
      }),
      new TableCell({
        children: monthEntry.items.map((item) => {
          return new Paragraph({
            children: [
              new TextRun({
                text: item.text,
                strike: item.completed,
              }),
            ],
          });
        }),
        width: {
          size: 85,
          type: WidthType.PERCENTAGE,
        },
        margins: CalendarCellMargins,
      }),
    ],
  });
};

const makeCalendar = (calendar: Calendar): (Paragraph | Table)[] => {
  if (calendar.length === 0) {
    return [];
  }
  return [
    new Paragraph({
      children: [new TextRun("Board Calendar Items")],
      style: "CalendarHeader",
    }),
    new Table({
      rows: calendar.map(makeMonthTableRow),
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
    }),
  ];
};

const makeCallToOrderParagraph = (session: Session): Paragraph[] => {
  const actualStartTime = session.topics[0]?.startTime ?? session.metadata.startTime;
  const formattedStartTime = actualStartTime.toLocaleTimeString(undefined, {
    timeStyle: "short",
    timeZone: "UTC",
  });
  const locationTextRun = new TextRun({
    text: `The meeting was held at the ${session.metadata.location}. `,
  });
  const paragraphTitle = new Paragraph({
    children: [
      new TextRun({
        text: session.metadata.subtitle,
      }),
    ],
    heading: HeadingLevel.HEADING_1,
  });
  const paragraphText = session.metadata.caller
    ? new Paragraph({
        children: [
          new TextRun({
            text: `The meeting was called by ${session.metadata.caller.role}. `,
          }),
          locationTextRun,
          makeSpeakerReference(session.metadata.caller.person),
          new TextRun({
            text: ` called the session to order at ${formattedStartTime}.`,
          }),
        ],
      })
    : new Paragraph({
        children: [
          locationTextRun,
          new TextRun({
            text: `The session was called to order at ${formattedStartTime}.`,
          }),
        ],
      });

  return [paragraphTitle, paragraphText];
};

const makeTopicHeader = (topic: Topic): Table => {
  const cells: TableCell[] = [
    new TableCell({
      children: [
        new Paragraph(
          topic.startTime.toLocaleTimeString(undefined, {
            timeStyle: "short",
            timeZone: "UTC",
          })
        ),
      ],
      shading: TopicHeaderCellShading,
      width: {
        size: 15,
        type: WidthType.PERCENTAGE,
      },
      margins: TopicHeaderCellMargins,
    }),
  ];
  if (topic.durationMinutes) {
    cells.push(
      new TableCell({
        children: [new Paragraph(topic.durationMinutes.toString())],
        shading: TopicHeaderCellShading,
        width: {
          size: 10,
          type: WidthType.PERCENTAGE,
        },
        margins: TopicHeaderCellMargins,
      })
    );
  }
  cells.push(
    new TableCell({
      children: [new Paragraph(topic.title)],
      shading: TopicHeaderCellShading,
      margins: TopicHeaderCellMargins,
    })
  );
  return new Table({
    rows: [
      new TableRow({
        children: cells,
      }),
    ],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
};

const makeTextNoteParagraphs = (note: TextNote): Paragraph[] => [
  new Paragraph({
    children: [new TextRun(note.text)],
    style: "NoteFinalLine",
  }),
];

type ActionItemNoteOrPastActionItem = {
  assignee: Person;
  text: string;
  dueDate: Date;
  completed?: boolean;
};
const makeActionItemTextRuns = (
  actionItem: ActionItemNoteOrPastActionItem,
  showStatus: boolean
): TextRun[] => {
  const textRuns = [
    new TextRun({
      text: "Action item: ",
      style: "ActionItemPrefix",
    }),
    makeSpeakerReference(actionItem.assignee),
    new TextRun({
      text: ` to ${actionItem.text} by ${actionItem.dueDate.toLocaleDateString(
        "en-US",
        { dateStyle: "short", timeZone: "UTC" }
      )}.`,
    }),
  ];

  if (showStatus) {
    if (actionItem.completed === false) {
      textRuns.push(
        new TextRun({
          text: " (Carried forward)",
          style: "ActionItemCarried",
        })
      );
    } else if (actionItem.completed === true) {
      textRuns.push(
        new TextRun({
          text: " (Done)",
          style: "ActionItemDone",
        })
      );
    } else {
      textRuns.push(
        new TextRun({
          text: " (Added)",
          style: "ActionItemAdded",
        })
      );
    }
  }
  return textRuns;
};

const makeActionItemParagraphs = (note: ActionItemNote): Paragraph[] => [
  new Paragraph({
    children: makeActionItemTextRuns(note, false),
    style: "NoteFinalLine",
  }),
];

const makeMoverParagraph = (note: MotionNote): Paragraph =>
  new Paragraph({
    children: [
      makeSpeakerReference(note.mover),
      new TextRun({
        text: ` moved ${note.text}`,
      }),
    ],
    style: "MotionInternal",
  });

const makeSeconderParagraph = (note: MotionNote): Paragraph =>
  new Paragraph({
    children: [
      makeSpeakerReference(note.seconder as Person),
      new TextRun({
        text: " seconded.",
      }),
    ],
    style: "MotionInternal",
  });

const makeVoteParagraph = (note: MotionNote): Paragraph => {
  const voteTallies = [];
  if (note.inFavorCount) {
    voteTallies.push(`${note.inFavorCount} in favor`);
  }
  if (note.opposedCount) {
    voteTallies.push(`${note.opposedCount} opposed`);
  }
  if (note.abstainedCount) {
    voteTallies.push(`${note.abstainedCount} abstained`);
  }
  return new Paragraph({
    children: [
      new TextRun({
        text: "Vote:",
        style: "MotionVotePrefix",
      }),
      new TextRun({
        text: ` ${voteTallies.join(", ")}`,
      }),
    ],
    style: "MotionInternal",
  });
};

const makeOutcomeParagraph = (note: MotionNote): Paragraph => {
  let outcomeText: string;
  switch (note.outcome) {
    case "active":
      outcomeText = "Motion is under discussion.";
      break;
    case "passed":
      outcomeText = "Motion passes.";
      break;
    case "failed":
      outcomeText = "Motion fails.";
      break;
    case "withdrawn":
      outcomeText = "Motion is withdrawn.";
      break;
    case "tabled":
      outcomeText = "Motion is tabled.";
      break;
  }
  return new Paragraph({
    children: [
      new TextRun({
        text: outcomeText,
      }),
    ],
    style: "MotionOutcome",
  });
};

const makeMotionParagraphs = (note: MotionNote): Paragraph[] => {
  const motionParagraphs: Paragraph[] = [];
  motionParagraphs.push(makeMoverParagraph(note));
  if (note.seconder) {
    motionParagraphs.push(makeSeconderParagraph(note));
  }
  if (note.outcome === "failed" || note.outcome === "passed") {
    motionParagraphs.push(makeVoteParagraph(note));
  }
  motionParagraphs.push(makeOutcomeParagraph(note));
  return motionParagraphs;
};

const makeTopicBody = (topic: Topic): Paragraph[] => {
  const noteParagraphs = topic.notes.flatMap((note) => {
    if (isTextNote(note)) {
      return makeTextNoteParagraphs(note);
    } else if (isActionItemNote(note)) {
      return makeActionItemParagraphs(note);
    } else {
      return makeMotionParagraphs(note);
    }
  });
  if (noteParagraphs.length === 0) {
    return [emptyLine()];
  } else {
    return noteParagraphs;
  }
};

const makeCommitteeBulletPoint = (committee: Committee): Paragraph => {
  return new Paragraph({
    children: [new TextRun(`${committee.name} (${committee.type})`)],
    bullet: {
      level: 0,
    },
  });
};

const makeCommitteesSection = (
  committees: Committee[],
  committeeDocUrl?: string
): Paragraph[] => {
  const headerChildren: TextRun[] = [new TextRun("Active Committees: ")];
  if (committeeDocUrl) {
    headerChildren.push(
      new TextRun({ text: "(Committees.docx)", style: "Hyperlink" })
    );
  }
  return [
    new Paragraph({
      children: headerChildren,
      style: "CommitteeHeader",
    }),
    ...committees.map(makeCommitteeBulletPoint),
  ];
};

const makeListedActionItemBulletPoint = (
  actionItem: ActionItemNote | PastActionItem
): Paragraph => {
  return new Paragraph({
    children: makeActionItemTextRuns(actionItem, true),
    bullet: {
      level: 0,
    },
  });
};

const makeListedActionItemParagraphs = (
  topics: Topic[],
  pastActionItems: PastActionItem[]
): Paragraph[] => {
  const sessionActionItems = topics.flatMap((topic) =>
    topic.notes.filter(isActionItemNote)
  );
  const allActionItems = [...sessionActionItems, ...pastActionItems].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  );
  return [
    new Paragraph({
      children: [
        new TextRun({ text: "Action Items:", style: "ActionItemHeader" }),
        new TextRun(" (New and carried forward from previous meetings)"),
      ],
    }),
    ...allActionItems.map(makeListedActionItemBulletPoint),
  ];
};

const emptyLine = () => new Paragraph({ children: [new TextRun("")] });

export const exportSessionToDocx: (session: Session) => Promise<Blob> = (
  session
) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...sessionHeader(session.metadata),
          emptyLine(),
          ...attendanceSection(session.metadata),
          ...makeCallToOrderParagraph(session),
          ...makeCalendar(session.calendar),
          emptyLine(),
          ...session.topics.flatMap((topic) => [
            makeTopicHeader(topic),
            ...makeTopicBody(topic),
          ]),
          ...makeCommitteesSection(
            session.committees,
            session.metadata.committeeDocUrl
          ),
          emptyLine(),
          ...makeListedActionItemParagraphs(
            session.topics,
            session.pastActionItems
          ),
        ],
      },
    ],
    styles: Styles,
  });
  return Packer.toBlob(doc);
};
