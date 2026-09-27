const fs = require('fs');
let code = fs.readFileSync('apps/api/src/virtual-trading/virtual-trading.service.ts', 'utf8');

const targetStr = `      // Load position
      const position = await tx.position.findUnique({
        where: { accountId_instrumentId: { accountId: session.paperAccountId, instrumentId: session.instrumentId } }
      });`;

const newStr = targetStr + `
      if (position && currentPrice.gt(position.highWatermark || position.averageEntryPrice)) {
         await tx.position.update({
           where: { id: position.id },
           data: { highWatermark: currentPrice }
         });
      }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('apps/api/src/virtual-trading/virtual-trading.service.ts', code);
}
