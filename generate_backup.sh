#!/usr/bin/env bash
# ==============================================================================
# Script: generate_backup.sh
# Purpose: Generates clean, verified ZIP and TAR.GZ backup archives for the
#          AML Investigation Workbench project.
#
# Rules:
#  - Retains all source code, tests, synthetic datasets, documentation, and .env.example
#  - Excludes real .env secrets, node_modules, dist build outputs, .aistudio, and logs
#  - Preserves local data and source files (never deletes local workspace files)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

OUTPUT_ZIP="/tmp/aml-investigation-workbench-backup.zip"
OUTPUT_TAR="/tmp/aml-investigation-workbench-backup.tar.gz"

echo "=== AML Investigation Workbench Backup Generator ==="
echo "Project root: $PROJECT_ROOT"
echo "Target ZIP:   $OUTPUT_ZIP"
echo "Target TAR:   $OUTPUT_TAR"

cd "$PROJECT_ROOT"

# Ensure required files exist before packaging
REQUIRED_FILES=(
  "package.json"
  "tsconfig.json"
  "vite.config.ts"
  "index.html"
  "server.ts"
  "README.md"
  "LICENSE"
  ".gitignore"
  ".env.example"
  "server/services/evaluations.ts"
  "data/aml_workbench_db.json"
)

echo "Verifying presence of essential workspace files..."
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Required file missing from workspace: $file" >&2
    exit 1
  fi
done
echo "All essential workspace files verified."

# Build file list excluding node_modules, dist, secrets, runtime artifacts, and git
echo "Compiling archive file manifest..."
MANIFEST=$(mktemp)

# Find all files to include:
# Include .env.example explicitly, but ignore other .env* files
find . -type f \
  ! -path "./node_modules/*" \
  ! -path "./dist/*" \
  ! -path "./.aistudio/*" \
  ! -path "./.git/*" \
  ! -path "./*.log" \
  ! -name ".DS_Store" \
  | grep -vE '^\./\.env($|\..*)' | sort > "$MANIFEST"

# Ensure .env.example is explicitly in the manifest
if [ -f ".env.example" ] && ! grep -qx "\./\.env.example" "$MANIFEST"; then
  echo "./.env.example" >> "$MANIFEST"
fi

TOTAL_FILES=$(wc -l < "$MANIFEST")
echo "Files queued for packaging: $TOTAL_FILES"

# 1. Generate ZIP archive using python3 zipfile (universal, no external zip binary needed)
echo "Creating ZIP archive at $OUTPUT_ZIP..."
rm -f "$OUTPUT_ZIP"
python3 - << 'PYEOF' "$PROJECT_ROOT" "$OUTPUT_ZIP" "$MANIFEST"
import sys, os, zipfile

project_root = sys.argv[1]
output_zip = sys.argv[2]
manifest_file = sys.argv[3]

with open(manifest_file, 'r') as f:
    files = [line.strip() for line in f if line.strip()]

with zipfile.ZipFile(output_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for rel_path in files:
        clean_rel = rel_path[2:] if rel_path.startswith('./') else rel_path
        abs_path = os.path.join(project_root, clean_rel)
        if os.path.exists(abs_path):
            zf.write(abs_path, arcname=clean_rel)

print(f"Packaged {len(files)} files into {output_zip}")
PYEOF

# 2. Generate TAR.GZ archive
echo "Creating TAR.GZ archive at $OUTPUT_TAR..."
rm -f "$OUTPUT_TAR"
tar -czf "$OUTPUT_TAR" -T "$MANIFEST"

rm -f "$MANIFEST"

# Check archives
ZIP_SIZE=$(stat -c%s "$OUTPUT_ZIP" 2>/dev/null || stat -f%z "$OUTPUT_ZIP")
TAR_SIZE=$(stat -c%s "$OUTPUT_TAR" 2>/dev/null || stat -f%z "$OUTPUT_TAR")

echo "=== Backup Generation Complete ==="
echo "ZIP size:    $ZIP_SIZE bytes ($OUTPUT_ZIP)"
echo "TAR.GZ size: $TAR_SIZE bytes ($OUTPUT_TAR)"

# Verification of key contents inside the ZIP
echo "Verifying ZIP contents..."
python3 - << 'PYEOF' "$OUTPUT_ZIP"
import sys, zipfile

archive = sys.argv[1]
with zipfile.ZipFile(archive, 'r') as zf:
    names = zf.namelist()
    print(f"Total entries in ZIP: {len(names)}")
    check_targets = [
        '.env.example',
        'README.md',
        'LICENSE',
        '.gitignore',
        'package.json',
        'server.ts',
        'server/services/evaluations.ts',
        'data/aml_workbench_db.json'
    ]
    for target in check_targets:
        if target in names:
            info = zf.getinfo(target)
            print(f"  ✓ Verified '{target}' ({info.file_size} bytes)")
        else:
            print(f"  ✗ MISSING: '{target}'")
            sys.exit(1)
            
    # Also verify that NO secrets, node_modules, or real .env were included
    forbidden = [n for n in names if n == '.env' or n.startswith('node_modules') or n.startswith('dist') or n.startswith('.aistudio')]
    if forbidden:
        print(f"  ✗ FORBIDDEN entries found: {forbidden[:5]}")
        sys.exit(1)
    else:
        print("  ✓ Security check passed: 0 forbidden files (.env, node_modules, dist, .aistudio)")
PYEOF

echo "Backup verification SUCCESSFUL."
