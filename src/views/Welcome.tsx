import { SignInButton } from "@clerk/clerk-react";
// import { PasskeyAuthBasicUI } from "jazz-tools/react";

export const Welcome = () => {
  return (
    <>
      <h2>Welcome!</h2>
      <p>
        This app will help you prepare for the next board meeting and follow
        along during the board meeting. Create an account or sign in to get
        started.
      </p>
      <SignInButton />
    </>
  );
};
