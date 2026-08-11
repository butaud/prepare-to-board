// Ported directly from butaud/minutes-taker's src/fs/style.ts, unchanged.
// Keeping this byte-for-byte identical is what makes the exported .docx
// look like minutes-taker's output.
import {
  IShadingAttributesProperties,
  IStylesOptions,
  ITableCellOptions,
  WidthType,
} from "docx";

export const Styles: IStylesOptions = {
  default: {
    heading1: {
      run: {
        size: 32,
        bold: true,
        color: "000000",
        font: "Calibri Bold",
      },
      paragraph: {
        spacing: {
          after: 120,
        },
      },
    },
    heading2: {
      run: {
        size: 24,
        bold: true,
        color: "000000",
        font: "Calibri Bold",
      },
    },
    document: {
      run: {
        size: 22,
        color: "000000",
        font: "Calibri",
      },
    },
  },
  paragraphStyles: [
    {
      id: "CalendarHeader",
      name: "Calendar Header",
      run: {
        bold: true,
      },
      paragraph: {
        spacing: {
          before: 200,
        },
      },
    },
    {
      id: "MotionInternal",
      name: "Motion Internal Line",
      paragraph: {
        spacing: {
          afterAutoSpacing: false,
        },
      },
    },
    {
      id: "NoteFinalLine",
      name: "Note Final Line",
      basedOn: "Normal",
      paragraph: {
        spacing: {
          after: 200,
        },
      },
    },
    {
      id: "MotionOutcome",
      name: "Motion Outcome Line",
      basedOn: "NoteFinalLine",
      run: {
        bold: true,
      },
    },
    {
      id: "CommitteeHeader",
      name: "Committee Header",
      basedOn: "Normal",
      run: {
        bold: true,
        underline: {
          color: "000000",
        },
      },
    },
  ],
  characterStyles: [
    {
      id: "MinuteStateDraft",
      name: "Minute State Draft",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        color: "c0504d",
      },
    },
    {
      id: "SpeakerReference",
      name: "Speaker Reference",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        color: "4f81bd",
        bold: true,
      },
    },
    {
      id: "ActionItemPrefix",
      name: "Action Item Prefix",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        italics: true,
      },
    },
    {
      id: "ActionItemCarried",
      name: "Action Item Carried",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        bold: true,
        color: "000000",
      },
    },
    {
      id: "ActionItemDone",
      name: "Action Item Done",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        bold: true,
        color: "9bbb59",
      },
    },
    {
      id: "ActionItemAdded",
      name: "Action Item Added",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        bold: true,
        color: "4f81bd",
      },
    },
    {
      id: "MotionVotePrefix",
      name: "Motion Vote Prefix",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        bold: true,
      },
    },
    {
      id: "ActionItemHeader",
      name: "Action Item Header",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        bold: true,
        underline: {
          color: "000000",
        },
      },
    },
  ],
};

export const TopicHeaderCellShading: IShadingAttributesProperties = {
  fill: "b8cce4",
};

export const TopicHeaderCellMargins: ITableCellOptions["margins"] = {
  marginUnitType: WidthType.DXA,
  top: 100,
  bottom: 100,
  left: 200,
  right: 200,
};

export const CalendarCellMargins: ITableCellOptions["margins"] = {
  marginUnitType: WidthType.DXA,
  top: 10,
  bottom: 10,
  left: 75,
  right: 75,
};
