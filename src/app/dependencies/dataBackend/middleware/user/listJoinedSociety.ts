import { getServerSession } from "next-auth";
import {
  ERROR_NO_USER_IN_SESSION,
  ERROR_SESSION_NOT_FOUND
} from "@/app/dependencies/error/session";
import { connect } from "@/app/dependencies/dataBackend/dataSource";
import { ERROR_UNKNOWN } from "@/app/dependencies/error/unknown";
import processDBError from "@/app/dependencies/error/database";

export default async function listJoinedSociety() {
  const session = await getServerSession();
  if (!session) {
    throw ERROR_SESSION_NOT_FOUND;
  }
  if (!session.user) {
    throw ERROR_NO_USER_IN_SESSION;
  }
  const client = await connect();
  try {
    const result = await client.query(
      `SELECT s.Uuid, s.Name
       FROM "Society".Membership m
              JOIN "Society".Society s
                   ON m.Society = s.Uuid
       WHERE m.Individual = $1 AND m.IsActive;`,
      [ session.user.name ]
    );
    if (!result.rowCount) {
      return [];
    }
    return result.rows.map(row => [ row.uuid, row.name ]);
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