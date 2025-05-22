// app/api/products/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

// Initialize PostgreSQL connection pool
const pool = new Pool({
  host:     process.env.PG_HOST,
  port:     parseInt(process.env.PG_PORT || "5432"),
  user:     process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Pull out filters
    const anaKategori      = searchParams.get("anaKategori");
    const maxDiscountRatio = searchParams.get("discountRatio_lt");
    const minDiscountRatio = searchParams.get("discountRatio_gt");

    // Build WHERE clauses and parameter array
    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let idx = 1;

    if (anaKategori) {
      conditions.push(`ana_kategori = $${idx}`);
      values.push(anaKategori);
      idx++;
    }
    if (maxDiscountRatio) {
      conditions.push(`discount_ratio < $${idx}`);
      values.push(parseFloat(maxDiscountRatio));
      idx++;
    }
    if (minDiscountRatio) {
      conditions.push(`discount_ratio > $${idx}`);
      values.push(parseFloat(minDiscountRatio));
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query with sorting
    const sql = `
      SELECT *
      FROM products
      ${where}
      ORDER BY discount_ratio DESC
      limit 1000
    `;

    const result = await pool.query(sql, values);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("API /api/products error:", error);
    return new NextResponse(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
