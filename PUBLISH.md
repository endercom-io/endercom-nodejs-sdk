# Publishing the Endercom Node.js SDK to npm

This guide explains how to publish the Endercom Node.js SDK to npm (Node Package Manager).

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com) if you don't have one
2. **npm CLI**: Make sure you have npm installed (comes with Node.js)
3. **Login**: Login to npm from your terminal:
   ```bash
   npm login
   ```

## Pre-Publishing Checklist

1. **Update Version**: Update the version in `package.json`
2. **Update Changelog**: Document changes (if you maintain a CHANGELOG.md)
3. **Test Locally**: Make sure everything works:
   ```bash
   npm run build
   npm link  # Link locally for testing
   ```
4. **Check README**: Ensure README.md is up to date
5. **Run Tests**: Make sure all tests pass (if you have them):
   ```bash
   npm test
   ```

## Building the Package

Build the TypeScript code:

```bash
cd endercom-nodejs-sdk
npm run build
```

This creates the `dist/` folder with compiled JavaScript and TypeScript definitions.

## Testing Locally (Recommended)

Before publishing to npm, test locally:

```bash
# Build the package
npm run build

# Link locally for testing
npm link

# In another project, link to the local package
npm link endercom

# Test the installation
node -e "const { Agent } = require('endercom'); console.log('Import successful!')"

# Or test with TypeScript
node -e "import { Agent } from 'endercom'; console.log('Import successful!')"
```

## Publishing to npm

### Option 1: Using npm publish (Recommended)

```bash
npm publish --access public
```

The `--access public` flag is required for scoped packages or first-time publishing.

### Option 2: Using npm publish with version bump

```bash
# Bump version and publish
npm version patch  # or minor, or major
npm publish --access public
```

### Option 3: Using the publish script

The package.json already has a script configured:

```bash
npm run publish:public
```

This runs `prepublishOnly` (which builds) and then publishes.

## Verifying Publication

After publishing, verify on npm:

1. Check package page: https://www.npmjs.com/package/endercom
2. Test installation:
   ```bash
   npm install endercom
   ```
3. Verify import:
   ```javascript
   const { Agent } = require("endercom");
   console.log(Agent);
   ```

## Updating the Package

To publish a new version:

1. Update version in `package.json`:

   ```json
   {
     "version": "1.1.1" // Increment as needed
   }
   ```

2. Build:

   ```bash
   npm run build
   ```

3. Publish:
   ```bash
   npm publish --access public
   ```

Or use npm version to bump and publish:

```bash
npm version patch  # 1.1.0 -> 1.1.1
npm version minor  # 1.1.0 -> 1.2.0
npm version major  # 1.1.0 -> 2.0.0
npm publish --access public
```

## Version Format

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 1.1.0)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Troubleshooting

### "Package name already exists"

- The package name `endercom` might already be taken
- Check if it exists: https://www.npmjs.com/package/endercom
- If it's your package, you're updating it (make sure version is incremented)
- If it's someone else's, you need to choose a different name

### "You must verify your email"

- npm requires email verification
- Check your email and verify your npm account

### "403 Forbidden"

- You don't have permission to publish this package
- Make sure you're logged in: `npm whoami`
- Make sure you own the package or are part of the organization

### "Version already exists"

- The version you're trying to publish already exists
- Increment the version in `package.json`

### "Build failed"

- Make sure TypeScript compiles:
  ```bash
  npm run build
  ```
- Check for TypeScript errors
- Make sure all dependencies are installed: `npm install`

## Security Best Practices

1. **Use npm tokens**: Prefer API tokens over passwords
2. **Don't Commit Secrets**: Never commit `.npmrc` with tokens to git
3. **Use CI/CD**: Consider automating publishing via GitHub Actions
4. **Two-Factor Authentication**: Enable 2FA on your npm account

## Automated Publishing (GitHub Actions)

You can set up GitHub Actions to automatically publish on release:

1. Create `.github/workflows/publish.yml`
2. Add `NPM_TOKEN` to GitHub repository secrets
3. Create a GitHub release to trigger publishing

## Quick Reference

```bash
# Login to npm
npm login

# Build
npm run build

# Test locally
npm link

# Publish
npm publish --access public

# Bump version and publish
npm version patch && npm publish --access public

# Check who you're logged in as
npm whoami

# Logout
npm logout
```
