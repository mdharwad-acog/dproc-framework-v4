#!/bin/bash
set -e

echo "🔄 Updating package names from @dproc to @aganitha..."

# 1. Update TypeScript source files ONLY (not dist/ or .next/)
echo "📝 Updating imports in source files..."

# Update in dproc-types/src
find packages/dproc-types/src -type f -name "*.ts" -exec sed -i 's/@dproc\//@aganitha\/dproc-/g' {} +

# Update in dproc-core/src
find packages/dproc-core/src -type f -name "*.ts" -exec sed -i 's/@dproc\//@aganitha\/dproc-/g' {} +

# Update in dproc-cli/src
find packages/dproc-cli/src -type f -name "*.ts" -exec sed -i 's/@dproc\//@aganitha\/dproc-/g' {} +

# Update in dproc-web/app (Next.js source)
find apps/dproc-web/app -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/@dproc\//@aganitha\/dproc-/g' {} +
find apps/dproc-web/lib -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/@dproc\//@aganitha\/dproc-/g' {} +
find apps/dproc-web/hooks -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/@dproc\//@aganitha\/dproc-/g' {} +
find apps/dproc-web/components -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/@dproc\//@aganitha\/dproc-/g' {} +

# 2. Update package.json files
echo "📦 Updating package.json files..."

# dproc-types
sed -i 's/"name": "@dproc\/types"/"name": "@aganitha\/dproc-types"/' packages/dproc-types/package.json

# dproc-core
sed -i 's/"name": "@dproc\/core"/"name": "@aganitha\/dproc-core"/' packages/dproc-core/package.json
sed -i 's/"@dproc\/types"/"@aganitha\/dproc-types"/' packages/dproc-core/package.json

# dproc-cli
sed -i 's/"name": "@dproc\/cli"/"name": "@aganitha\/dproc-cli"/' packages/dproc-cli/package.json
sed -i 's/"@dproc\/core"/"@aganitha\/dproc-core"/' packages/dproc-cli/package.json
sed -i 's/"@dproc\/types"/"@aganitha\/dproc-types"/' packages/dproc-cli/package.json

# dproc-web
sed -i 's/"@dproc\/core"/"@aganitha\/dproc-core"/' apps/dproc-web/package.json
sed -i 's/"@dproc\/types"/"@aganitha\/dproc-types"/' apps/dproc-web/package.json

echo "✅ Package names updated!"
echo ""
echo "🔍 Verifying source files..."
if grep -r "@dproc/" packages/*/src apps/dproc-web/app 2>/dev/null; then
    echo "⚠️  Warning: Some @dproc references still remain in source"
else
    echo "✅ All source files updated successfully!"
fi

echo ""
echo "Next steps:"
echo "1. Clean old builds: rm -rf packages/*/dist apps/dproc-web/.next"
echo "2. Reinstall deps: pnpm install"
echo "3. Rebuild: pnpm build"
echo "4. Publish: ./scripts/publish-npm.sh"
