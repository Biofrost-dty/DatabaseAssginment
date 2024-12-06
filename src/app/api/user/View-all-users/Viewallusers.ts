import { getServerSession } from "next-auth";
import { ERROR_NO_USER_IN_SESSION, ERROR_SESSION_NOT_FOUND } from "@/app/dependencies/error/session";
import { connect } from "@/app/dependencies/dataBackend/dataSource";
import { ERROR_UNKNOWN } from "@/app/dependencies/error/unknown";
import processDBError from "@/app/dependencies/error/database";

export default async function listOrganisationUsers(organisationUuid: string, filters: { parentOrganisation?: string, society?: string, isActive?: boolean }) {
  const session = await getServerSession();
  if (!session || !session.user) {
    throw ERROR_SESSION_NOT_FOUND;
  }

  const client = await connect();
  try {
    const { parentOrganisation, society, isActive } = filters;

    const query = `
      SELECT i.Username, i.Name, o.Name AS OrganisationName, i.IsActive
      FROM "Society".Individual i
      JOIN "Society".Organisation o ON i.Organisation = o.Uuid
      LEFT JOIN "Society".Society s ON s.Organisation = o.Uuid
      WHERE 
        o.Uuid = $1
        AND ($2::text IS NULL OR o.Parent = $2)
        AND ($3::text IS NULL OR s.Uuid = $3)
        AND ($4::boolean IS NULL OR i.IsActive = $4)
    `;
    
    const result = await client.query(query, [
      organisationUuid,
      filters.parentOrganisation || null,
      filters.society || null,
      filters.isActive || null
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
