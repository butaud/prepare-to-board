import "@testing-library/jest-dom";
import { expect, vi } from "vitest";
import "@clerk/clerk-react";

expect.extend({
  toPrecede(received: HTMLElement, expected: HTMLElement) {
    const comparison = received.compareDocumentPosition(expected);
    const pass = !!(comparison & Node.DOCUMENT_POSITION_FOLLOWING);
    return {
      pass,
      message: () =>
        this.isNot
          ? `expected ${received.outerHTML} not to precede ${expected.outerHTML}`
          : `expected ${received.outerHTML} to precede ${expected.outerHTML}`,
    };
  },
});

vi.mock("@clerk/clerk-react", async (importActual) => {
  const actual = await importActual<typeof import("@clerk/clerk-react")>();
  const { MockUserButton } = await import("./mocks/MockUserButton");

  return {
    ...actual,
    SignInButton: () => {
      return <button>Sign in</button>;
    },
    SignOutButton: ({ children }: { children: React.ReactNode }) => {
      return <button>{children}</button>;
    },
    UserButton: MockUserButton,
  };
});

// Mocking react-icons to make the debug output cleaner (the SVG definitions are huge)
// eslint-disable-next-line react-refresh/only-export-components
const FakeIcon = ({ name }: { name: string }) => (
  <svg data-testid={`mock-icon-${name}`} />
);

vi.mock("react-icons/lu", async (importActual) => {
  const actual = await importActual<typeof import("react-icons/lu")>();
  return {
    ...actual,
    LuCalendarDays: () => <FakeIcon name="LuCalendarDays" />,
    LuListChecks: () => <FakeIcon name="LuListChecks" />,
    LuSettings2: () => <FakeIcon name="LuSettings2" />,
  };
});

vi.mock("react-icons/cg", async (importActual) => {
  const actual = await importActual<typeof import("react-icons/cg")>();
  return {
    ...actual,
    CgFileDocument: () => <FakeIcon name="CgFileDocument" />,
  };
});

vi.mock("react-icons/lia", async (importActual) => {
  const actual = await importActual<typeof import("react-icons/lia")>();
  return {
    ...actual,
    LiaUsersCogSolid: () => <FakeIcon name="LiaUsersCogSolid" />,
    LiaUsersSolid: () => <FakeIcon name="LiaUsersSolid" />,
  };
});

vi.mock("react-icons/md", async (importActual) => {
  const actual = await importActual<typeof import("react-icons/md")>();
  return {
    ...actual,
    MdDelete: () => <FakeIcon name="MdDelete" />,
    MdEdit: () => <FakeIcon name="MdEdit" />,
  };
});

vi.mock("react-icons/sl", async (importActual) => {
  const actual = await importActual<typeof import("react-icons/sl")>();
  return {
    ...actual,
    SlPlus: () => <FakeIcon name="SlPlus" />,
    SlBan: () => <FakeIcon name="SlBan" />,
    SlTrash: () => <FakeIcon name="SlTrash" />,
  };
});

// Fix dialogs which are not supported in jsdom
HTMLDialogElement.prototype.showModal = vi
  .fn()
  .mockImplementation(function (this: HTMLDialogElement) {
    this.open = true;
  });
HTMLDialogElement.prototype.close = vi
  .fn()
  .mockImplementation(function (this: HTMLDialogElement) {
    this.open = false;
  });
HTMLDialogElement.prototype.show = vi
  .fn()
  .mockImplementation(function (this: HTMLDialogElement) {
    this.open = true;
  });
