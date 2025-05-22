import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host:     process.env.PG_HOST,
  port:     parseInt(process.env.PG_PORT || "5432"),
  user:     process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
});


export async function GET() {
  const res = await pool.query(
    `SELECT DISTINCT kategori FROM products ORDER BY alt_kategori`
  );
  return NextResponse.json(res.rows.map(r => r.kategori));
}
