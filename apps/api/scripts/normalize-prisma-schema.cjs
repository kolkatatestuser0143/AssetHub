const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const source = fs.readFileSync(schemaPath, 'utf8');

function toSnakeCase(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

const scalarTypes = new Set([
  'String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes',
]);

const lines = source.split(/\r?\n/);
const output = lines.map((line) => {
  const match = line.match(/^(\s+)([A-Za-z_][A-Za-z0-9_]*)\s+(String|Int|BigInt|Float|Decimal|Boolean|DateTime|Json|Bytes)(\[\])?(\?)?(\s+.*)?$/);
  if (!match) return line;

  const [, indent, field, type, arraySuffix = '', optionalSuffix = '', rest = ''] = match;
  const snake = toSnakeCase(field);
  if (field === snake || /@map\s*\(/.test(rest)) return line;

  return `${indent}${field} ${type}${arraySuffix}${optionalSuffix}${rest} @map("${snake}")`;
});

const normalized = output.join('\n');
if (normalized !== source) {
  fs.writeFileSync(schemaPath, normalized, 'utf8');
  console.log(`Normalized Prisma column mappings in ${schemaPath}`);
} else {
  console.log('Prisma schema column mappings already normalized.');
}
