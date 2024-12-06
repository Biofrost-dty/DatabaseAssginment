import { getServerSession } from "next-auth";
import { ERROR_NO_USER_IN_SESSION, ERROR_SESSION_NOT_FOUND } from "@/app/dependencies/error/session";
import { connect } from "@/app/dependencies/dataBackend/dataSource";
import { ERROR_UNKNOWN } from "@/app/dependencies/error/unknown";
import processDBError from "@/app/dependencies/error/database";

export default async function bulkCreateUsers(users: Array<{ Username: string, Name: string, IsActive: boolean, Organisation: string, PasswordHash: string }>) {
  const session = await getServerSession();
  if (!session) {
    throw ERROR_SESSION_NOT_FOUND;
  }
  if (!session.user) {
    throw ERROR_NO_USER_IN_SESSION;
  }

  const client = await connect();
  try {
    const query = `
      INSERT INTO "Society".Individual (Username, Name, IsActive, Organisation, PasswordHash)
      VALUES ($1, $2, $3, $4, $5)
    `;
    const insertPromises = users.map(user => {
      return client.query(query, [user.Username, user.Name, user.IsActive, user.Organisation, user.PasswordHash]);
    });

    await Promise.all(insertPromises);

    return { message: "Users created successfully", users };
  } catch (e) {
    if (!(e instanceof Error)) {
      throw ERROR_UNKNOWN;
    }
    e = processDBError(e);
    throw e;
  } finally {
    client.release();
  }
}
