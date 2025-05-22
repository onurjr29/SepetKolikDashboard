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
export async function GET(req: NextRequest) {
  try{
        const { searchParams } = new URL(req.url);
    const ana_kategori = searchParams.get("ana_kategori");

    let query = `SELECT DISTINCT alt_kategori FROM products`;
    let params: any[] = [];

    if(ana_kategori){
      query += ` WHERE ana_kategori = $1`;
      params.push(ana_kategori);
    }



    const res = await pool.query(query, params);
    return NextResponse.json(res.rows.map(r => r.alt_kategori));

  }catch(err){
    console.error("GET /alt-kategoriler error:",err);
    return NextResponse.json({error: "Internal Server Error"}, {status: 500});

  }
}

  



