// Compatibility import for existing routes. PostgreSQL is the sole runtime database.
import { pool } from './postgres-store'
export async function connectToDatabase() {
  const connection = pool()
  await connection.query('SELECT 1')
  return connection
}
export default connectToDatabase
