import { useAccount } from "jazz-tools/react";
import { Schema } from "../schema";
import { Outlet } from "react-router-dom";
import { co } from "jazz-tools";
import { createContext, useContext } from "react";

export type LoadedAccount = co.loaded<
  typeof Schema.UserAccount,
  {
    root: {
      selectedOrganization: {
        meetings: {
          $each: true;
        };
      };
      organizations: {
        $each: true;
      };
    };
    profile: true;
  }
>;

export const LoadedAccountContext = createContext<LoadedAccount | undefined>(
  undefined
);

export const useLoadAccount = () => {
  const { me } = useAccount(Schema.UserAccount, {
    resolve: {
      root: {
        selectedOrganization: {
          meetings: { $each: true },
        },
        organizations: {
          $each: true,
        },
      },
      profile: true,
    },
  });
  return {
    me,
    outlet: me && (
      <LoadedAccountContext.Provider value={me}>
        <Outlet />
      </LoadedAccountContext.Provider>
    ),
  };
};

export const useLoadedAccount = () => {
  const account = useContext(LoadedAccountContext);
  if (account === undefined) {
    throw new Error(
      "useLoadedAccount must be used within a LoadedAccountContext provider"
    );
  }
  return account;
};
