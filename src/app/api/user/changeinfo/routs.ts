import { getServerSession } from "next-auth";
import { ERROR_NO_USER_IN_SESSION, ERROR_SESSION_NOT_FOUND } from "@/app/dependencies/error/session";
import { connect } from "@/app/dependencies/dataBackend/dataSource";
import { ERROR_UNKNOWN } from "@/app/dependencies/error/unknown";
import processDBError from "@/app/dependencies/error/database";

export default async function updateUserInfo(username: string, newInfo: { Name?: string, IsActive?: boolean, PasswordHash?: string }) {
  const session = await getServerSession();
  if (!session) {
    throw ERROR_SESSION_NOT_FOUND;
  }
  if (!session.user) {
    throw ERROR_NO_USER_IN_SESSION;
  }

  const client = await connect();
  try {
    let setClause = [];
    let values = [];
    if (newInfo.Name) {
      setClause.push("Name = $1");
      values.push(newInfo.Name);
    }
    if (newInfo.IsActive !== undefined) {
      setClause.push("IsActive = $2");
      values.push(newInfo.IsActive);
    }
    if (newInfo.PasswordHash) {
      setClause.push("PasswordHash = $3");
      values.push(newInfo.PasswordHash);
    }
    if (setClause.length === 0) {
      throw new Error("No fields to update");
    }

    const query = `
      UPDATE "Society".Individual
      SET ${setClause.join(", ")}
      WHERE Username = $${values.length + 1}
    `;
    values.push(username);
    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      throw new Error(`No user found with username: ${username}`);
    }

    return { message: "User information updated successfully", username };
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
