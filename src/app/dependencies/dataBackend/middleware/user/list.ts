import { connect } from "@/app/dependencies/dataBackend/dataSource";
import { getServerSession } from "next-auth";
import {
  ERROR_NO_USER_IN_SESSION,
  ERROR_SESSION_NOT_FOUND
} from "@/app/dependencies/error/session";
import { ERROR_UNKNOWN } from "@/app/dependencies/error/unknown";
import processDBError from "@/app/dependencies/error/database";

type User = [
  string, // username
  string, // name
  boolean, // isActive
  boolean, // isInitialized
  string // organisation
]

export default async function listUser(
  filterOrganisation: string[] | null,
  filterOrganisationHierarchy: string[] | null,
  filterSocieties: string[] | null,
  filterActive: boolean | null
) {
  const session = await getServerSession();
  if (!session) {
    throw ERROR_SESSION_NOT_FOUND;
  }
  if (!session.user?.name) {
    throw ERROR_NO_USER_IN_SESSION;
  }
  const conditions = [];
  const params: (string | string[] | boolean)[] = [];
  conditions.push(`
    EXISTS (
      WITH RECURSIVE OrganisationHierarchy AS (
        SELECT o0.Uuid, o0.Parent, o0.Representative
          FROM "Society".Organisation o0
          WHERE o0.Uuid = i.Organisation
        UNION
        SELECT o1.Uuid, o1.Parent, o1.Representative
          FROM "Society".Organisation o1
          JOIN OrganisationHierarchy oh
          ON o1.Uuid = oh.Parent
      )
      SELECT 1
      FROM OrganisationHierarchy oh
      WHERE Representative = $${ params.length + 1 }
  `);
  params.push(session.user.name);
  if (filterOrganisation) {
    conditions.push(`i.Organisation = ANY($${ params.length + 1 })`);
    params.push(filterOrganisation);
  }
  if (filterOrganisationHierarchy) {
    conditions.push(`
      EXISTS (
        WITH RECURSIVE OrganisationHierarchy AS (
          SELECT o1.Uuid, o1.Parent, o1.Representative
            FROM "Society".Organisation o1
            WHERE o1.Uuid = i.Organisation
          UNION
          SELECT o2.Uuid, o2.Parent, o2.Representative
            FROM "Society".Organisation o2
            JOIN OrganisationHierarchy oh
            ON o1.Uuid = oh.Parent
        )
        SELECT 1
        FROM OrganisationHierarchy oh
        WHERE Uuid = ANY($${ params.length + 1 })
      )
    `);
    params.push(filterOrganisationHierarchy);
  }
  if (filterSocieties) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM "Society".Membership m
        WHERE m.Individual = i.Username AND m.Society = ANY($${ params.length + 1 })
      )`
    );
    params.push(filterSocieties);
  }
  if (filterActive !== null) {
    conditions.push(`i.IsActive = $${ params.length + 1 }`);
    params.push(filterActive);
  }
  const query = `
    SELECT i.Username, i.Name, i.IsActive, i.IsInitialized, o.Name AS Organisation
    FROM "Society".Individual i
           LEFT OUTER JOIN "Society".Organisation o ON i.Organisation = o.Uuid
    WHERE ${ conditions.join(" AND ") }
  `;
  const client = await connect();
  try {
    const result = await client.query(query, params);
    if (!result.rows) {
      return [];
    }
    return result.rows.map(row => [
      row.Username,
      row.Name,
      row.IsActive,
      row.IsInitialized,
      row.Organisation
    ]) as User[];
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