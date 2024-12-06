import { getServerSession } from "next-auth";
import { ERROR_NO_USER_IN_SESSION, ERROR_SESSION_NOT_FOUND } from "@/app/dependencies/error/session";
import { connect } from "@/app/dependencies/dataBackend/dataSource";
import { ERROR_UNKNOWN } from "@/app/dependencies/error/unknown";
import processDBError from "@/app/dependencies/error/database";

export default async function updateSubOrganisation(orgUuid: string, newParentOrganisation: string) {
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
      UPDATE "Society".Organisation
      SET Parent = $1
      WHERE Uuid = $2
    `;
    const result = await client.query(query, [newParentOrganisation, orgUuid]);

    if (result.rowCount === 0) {
      throw new Error(`No organisation found with UUID: ${orgUuid}`);
    }

    return { message: "Organisation updated successfully", orgUuid, newParentOrganisation };
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
