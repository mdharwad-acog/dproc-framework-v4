#!/bin/bash
set -e

echo "🚀 Publishing DProc packages to Aganitha NPM registry..."

# Check if .npmrc is configured
if ! grep -q "@aganitha:registry=https://npm.aganitha.ai/" ~/.npmrc; then
    echo "❌ Error: .npmrc not configured for Aganitha registry"
    exit 1
fi

# Get version
read -p "Enter version to publish (e.g., 1.0.0): " VERSION

if [ -z "$VERSION" ]; then
    echo "❌ Version is required"
    exit 1
fi

echo "📦 Building packages..."
pnpm build

# Create temporary directory for publishing
PUBLISH_DIR=$(mktemp -d)
echo "📁 Using temporary directory: $PUBLISH_DIR"

# Function to publish a package with renamed scope
publish_package() {
    local PACKAGE_DIR=$1
    local PACKAGE_NAME=$2
    
    echo ""
    echo "📤 Publishing @aganitha/$PACKAGE_NAME@$VERSION..."
    
    # Copy package to temp dir
    cp -r "$PACKAGE_DIR" "$PUBLISH_DIR/$PACKAGE_NAME"
    cd "$PUBLISH_DIR/$PACKAGE_NAME"
    
    # Update package.json with @aganitha scope
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // Update name
        pkg.name = '@aganitha/$PACKAGE_NAME';
        pkg.version = '$VERSION';
        
        // Replace @dproc dependencies with @aganitha
        if (pkg.dependencies) {
            Object.keys(pkg.dependencies).forEach(dep => {
                if (dep.startsWith('@dproc/')) {
                    const newDep = dep.replace('@dproc/', '@aganitha/dproc-');
                    pkg.dependencies[newDep] = '^$VERSION';
                    delete pkg.dependencies[dep];
                }
            });
        }
        
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    
    # Publish
    npm publish --registry https://npm.aganitha.ai/ --access public
    
    cd -
}

# Publish packages in dependency order
publish_package "packages/dproc-types" "dproc-types"
publish_package "packages/dproc-core" "dproc-core"
publish_package "packages/dproc-cli" "dproc-cli"

# Cleanup
rm -rf "$PUBLISH_DIR"

echo ""
echo "✅ All packages published successfully!"
echo ""
echo "📦 Published packages:"
echo "  - @aganitha/dproc-types@$VERSION"
echo "  - @aganitha/dproc-core@$VERSION"
echo "  - @aganitha/dproc-cli@$VERSION"
echo ""
echo "Install globally with:"
echo "  npm install -g @aganitha/dproc-cli@$VERSION"
