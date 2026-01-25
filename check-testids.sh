#!/bin/bash

echo "🔍 Checking existing data-testid attributes in components..."
echo "=============================================="
echo ""

# Check all TypeScript/React files for data-testid
echo "📊 Files with data-testid attributes:"
grep -r "data-testid=" src/ --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u | while read file; do
  count=$(grep -c "data-testid=" "$file")
  echo "  ✅ $file ($count testids)"
done

echo ""
echo "📋 All unique data-testid values:"
grep -r "data-testid=" src/ --include="*.tsx" --include="*.ts" | \
  sed 's/.*data-testid="\([^"]*\)".*/\1/' | \
  sort -u | \
  while read testid; do
    echo "  - $testid"
  done

echo ""
echo "🔍 Checking for duplicates..."
grep -r "data-testid=" src/ --include="*.tsx" --include="*.ts" | \
  sed 's/.*data-testid="\([^"]*\)".*/\1/' | \
  sort | uniq -c | sort -rn | \
  awk '$1 > 1 {print "  ⚠️  DUPLICATE: \"" $2 "\" appears " $1 " times"}'

echo ""
echo "📈 Summary:"
total_files=$(grep -r "data-testid=" src/ --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u | wc -l)
total_testids=$(grep -r "data-testid=" src/ --include="*.tsx" --include="*.ts" | wc -l)
unique_testids=$(grep -r "data-testid=" src/ --include="*.tsx" --include="*.ts" | sed 's/.*data-testid="\([^"]*\)".*/\1/' | sort -u | wc -l)

echo "  - Files with testids: $total_files"
echo "  - Total testids: $total_testids"
echo "  - Unique testids: $unique_testids"

# Check for files without data-testid
echo ""
echo "⚠️  Components without data-testid attributes:"
for file in src/components/**/*.tsx src/pages/*.tsx src/monitoring/*.tsx; do
  if [ -f "$file" ]; then
    if ! grep -q "data-testid=" "$file"; then
      echo "  - $file"
    fi
  fi
done

echo ""
echo "✅ Check complete!"