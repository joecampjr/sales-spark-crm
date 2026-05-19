const fs = require('fs');
const path = require('path');

const routes = [
  'src/app/api/leads/route.ts',
  'src/app/api/leads/[id]/route.ts',
  'src/app/api/sellers/route.ts',
  'src/app/api/sellers/[id]/route.ts',
  'src/app/api/branches/route.ts',
  'src/app/api/branches/[id]/route.ts',
  'src/app/api/users/route.ts',
  'src/app/api/users/[id]/route.ts',
  'src/app/api/visits/route.ts',
  'src/app/api/visits/[id]/route.ts',
  'src/app/api/interactions/route.ts',
  'src/app/api/interactions/[id]/route.ts'
];

const authCheck = `
    const session = await getSession();
    if (!session || (!session.companyId && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
`;

routes.forEach(routePath => {
  const fullPath = path.join(__dirname, routePath);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');

  if (!content.includes('getSession')) {
    content = content.replace("import { NextResponse } from 'next/server';", "import { NextResponse } from 'next/server';\nimport { getSession } from '@/lib/auth';");
  }

  // Inject in GET
  content = content.replace(/export async function GET\([^)]*\) {\n\s*try {/g, match => {
    if (content.includes("const session = await getSession();")) return match;
    return `${match}${authCheck}`;
  });

  // Inject in POST
  content = content.replace(/export async function POST\([^)]*\) {\n\s*try {/g, match => {
    return `${match}${authCheck}`;
  });

  // Inject in PATCH
  content = content.replace(/export async function PATCH\([^)]*\) {\n\s*try {/g, match => {
    return `${match}${authCheck}`;
  });

  // Inject in DELETE
  content = content.replace(/export async function DELETE\([^)]*\) {\n\s*try {/g, match => {
    return `${match}${authCheck}`;
  });

  fs.writeFileSync(fullPath, content);
  console.log('Processed', routePath);
});
