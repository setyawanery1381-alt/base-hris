import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const result: any = {
    cwd: process.cwd(),
    dbUrl: process.env.DATABASE_URL,
    tmpExists: fs.existsSync('/tmp'),
    tmpFiles: fs.existsSync('/tmp') ? fs.readdirSync('/tmp') : [],
    prismaFiles: fs.existsSync(path.join(process.cwd(), 'prisma')) ? fs.readdirSync(path.join(process.cwd(), 'prisma')) : 'none',
  };

  try {
    const userCount = await db.user.count();
    result.userCount = userCount;
  } catch (err: any) {
    result.dbError = {
      message: err.message,
      code: err.code,
      stack: err.stack,
    };
  }

  return NextResponse.json(result);
}
