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
    const alt_kategori = searchParams.get("alt_kategori");

    let query = `SELECT DISTINCT kategori FROM products`;
    let params: any[] = [];

    if(ana_kategori && !alt_kategori){
      query += ` WHERE ana_kategori = $1`;
      params.push(ana_kategori);
    }

    if(alt_kategori && !ana_kategori){
      query += ` WHERE alt_kategori = $1`;
      params.push(alt_kategori);
    }

    if(ana_kategori && alt_kategori){
      query += ` WHERE ana_kategori = $1 AND alt_kategori = $2`;
      params.push(ana_kategori, alt_kategori);
    }
    
    
    const res = await pool.query(query, params);
    return NextResponse.json(res.rows.map(r => r.kategori));
  }catch(err){
    console.error("GET /kategoriler error:",err);
    return NextResponse.json({error: "Internal Server Error"}, {status: 500});
  }
  }

  



