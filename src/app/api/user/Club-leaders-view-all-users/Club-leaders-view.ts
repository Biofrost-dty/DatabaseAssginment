import { getServerSession } from "next-auth";
import { ERROR_NO_USER_IN_SESSION, ERROR_SESSION_NOT_FOUND } from "@/app/dependencies/error/session";
import { connect } from "@/app/dependencies/dataBackend/dataSource";
import { ERROR_UNKNOWN } from "@/app/dependencies/error/unknown";
import processDBError from "@/app/dependencies/error/database";

export default async function listSocietyUsers(societyUuid: string, filters: { organisation?: string, isActive?: boolean }) {
  const session = await getServerSession();
  if (!session || !session.user) {
    throw ERROR_SESSION_NOT_FOUND;
  }

  const client = await connect();
  try {
    const { organisation, isActive } = filters;

    const query = `
      SELECT i.Username, i.Name, i.IsActive, o.Name AS OrganisationName
      FROM "Society".Membership m
      JOIN "Society".Individual i ON m.Individual = i.Username
      JOIN "Society".Society s ON m.Society = s.Uuid
      JOIN "Society".Organisation o ON s.Organisation = o.Uuid
      WHERE 
        s.Uuid = $1
        AND ($2::text IS NULL OR o.Uuid = $2)
        AND ($3::boolean IS NULL OR i.IsActive = $3)
    `;
    
    const result = await client.query(query, [
      societyUuid,
      organisation || null,
      isActive || null
    ]);

    if (result.rowCount === 0) {
      return [];
    }

    return result.rows;
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
