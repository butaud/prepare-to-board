export type TestRole = "admin" | "officer" | "member";

export type TestUser = {
  email: string;
  password: string;
};

const readUser = (prefix: string): TestUser | undefined => {
  const email = process.env[`E2E_${prefix}_EMAIL`];
  const password = process.env[`E2E_${prefix}_PASSWORD`];
  if (!email || !password) return undefined;
  return { email, password };
};

export const testUsers: Record<TestRole, TestUser | undefined> = {
  admin: readUser("ADMIN"),
  officer: readUser("OFFICER"),
  member: readUser("MEMBER"),
};

export const configuredRoles = Object.entries(testUsers)
  .filter((entry): entry is [TestRole, TestUser] => entry[1] !== undefined)
  .map(([role]) => role);

export const allTestUsersConfigured = configuredRoles.length === 3;
