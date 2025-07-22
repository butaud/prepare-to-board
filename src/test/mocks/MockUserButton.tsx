import { useState } from "react";
import { createPortal } from "react-dom";

export const MockUserButton = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen((prev) => !prev);
  return (
    <>
      <button data-testid="mock-clerk-user-button" onClick={toggleMenu}>
        User Profile
      </button>
      {isOpen &&
        createPortal(
          <div data-testid="mock-clerk-user-button-menu">{children}</div>,
          document.body
        )}
    </>
  );
};

MockUserButton.UserProfilePage = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return children;
};
