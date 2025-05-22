import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host:     process.env.PG_HOST,
  port:     parseInt(process.env.PG_PORT || "5432"),
  user:     process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const anaKategori = searchParams.get("ana_kategori");
    const altKategori = searchParams.get("alt_kategori");
    const kategori    = searchParams.get("kategori");

    let query = "SELECT DISTINCT brand FROM products";
    let params: any[] = [];
    let conditions: string[] = [];

    if (anaKategori) {
      conditions.push(`ana_kategori = $${params.length + 1}`);
      params.push(anaKategori);
    }

    if (altKategori) {
      conditions.push(`alt_kategori = $${params.length + 1}`);
      params.push(altKategori);
    }

    if (kategori) {
      conditions.push(`kategori = $${params.length + 1}`);
      params.push(kategori);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY brand ASC";

    const result = await pool.query(query, params);
    const brands = result.rows.map(r => r.brand).filter(Boolean);

    return NextResponse.json(brands);

  } catch (err: any) {
    console.error("❌ Brand filtre API error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
