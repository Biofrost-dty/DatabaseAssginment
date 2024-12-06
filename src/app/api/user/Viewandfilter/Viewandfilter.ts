import { getServerSession } from "next-auth";
import { ERROR_NO_USER_IN_SESSION, ERROR_SESSION_NOT_FOUND } from "@/app/dependencies/error/session";
import { connect } from "@/app/dependencies/dataBackend/dataSource";
import { ERROR_UNKNOWN } from "@/app/dependencies/error/unknown";
import processDBError from "@/app/dependencies/error/database";

export default async function listUsers(filters: { username?: string, organisation?: string, isActive?: boolean }) {
  // 获取当前登录的管理员用户
  const session = await getServerSession();
  if (!session) {
    throw ERROR_SESSION_NOT_FOUND;
  }
  if (!session.user) {
    throw ERROR_NO_USER_IN_SESSION;
  }

  const client = await connect();
  try {
    // 构建查询条件
    const { username, organisation, isActive } = filters;
    const query = `
      SELECT Username, Name, Organisation, IsActive
      FROM "Society".Individual
      WHERE ($1::text IS NULL OR Username = $1)
        AND ($2::text IS NULL OR Organisation = $2)
        AND ($3::boolean IS NULL OR IsActive = $3)
    `;

    const result = await client.query(query, [username || null, organisation || null, isActive || null]);

    // 查询没有结果时返回空数组
    if (result.rowCount === 0) {
      return [];
    }

    // 返回符合条件的用户列表
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
