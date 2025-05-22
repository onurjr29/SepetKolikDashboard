import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host:     process.env.PG_HOST,
  port:     parseInt(process.env.PG_PORT || "5432"),
  user:     process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
});

// param alicak simdi 
export async function GET() {
  try{
    const res = await pool.query(
      `SELECT DISTINCT ana_kategori FROM products`,
    )
    return NextResponse.json(res.rows.map(r => r.ana_kategori));
  }catch(err){
    console.error("GET /ana-kategoriler error:",err);
    return NextResponse.json({error: "Internal Server Error"}, {status: 500});
  }
  }

  



