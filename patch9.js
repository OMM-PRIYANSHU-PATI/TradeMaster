const fs = require('fs');
let p = fs.readFileSync('apps/web/src/app/paper/page.tsx', 'utf8');
p = p.replace(/<any>/g, "<Record<string, unknown>>");
p = p.replace(/<any \| null>/g, "<Record<string, unknown> | null>");
p = p.replace(/<any\[\]>/g, "<Record<string, unknown>[]>");
p = p.replace(/const body: any = /g, "const body: Record<string, unknown> = ");
p = p.replace(/catch\(e: any\)/g, "catch(e: unknown)");
p = p.replace(/\(p: any\)/g, "(p: Record<string, unknown>)");
fs.writeFileSync('apps/web/src/app/paper/page.tsx', p);
