# Build Configuration Notes

This document explains specific workarounds implemented in this project to address build issues in cloud environments.

## Segmentation Fault (SIGSEGV) Fix

The project uses several settings to prevent segmentation faults during the build process on platforms like Vercel and Netlify:

### 1. Disabled Parcel Workers (`PARCEL_WORKERS=0`)

**Location:** `package.json` build script
```json
"build": "PARCEL_WORKERS=0 NODE_OPTIONS=--max-old-space-size=1024 parcel build src/index.html"
```

**Purpose:** Prevents Parcel from using multi-threading, which can cause memory issues in constrained CI environments. Fixes SIGSEGV crashes that occur after the build completes.

### 2. Memory Limitations (`NODE_OPTIONS=--max-old-space-size=1024`)

**Location:** `package.json` build script
```json
"build": "PARCEL_WORKERS=0 NODE_OPTIONS=--max-old-space-size=1024 parcel build src/index.html"
```

**Purpose:** Explicitly limits Node.js memory allocation to 1GB to prevent aggressive memory usage that might lead to segmentation faults.

### 3. Disabled CSS Optimizers

**Location:** `.parcelrc`
```json
"optimizers": {
  "*.css": []
}
```

**Purpose:** Completely disables Parcel's CSS optimizers (particularly LightningCSS) which are often the cause of segmentation faults in build environments.

### 4. Optimization Disabled in Targets

**Location:** `package.json` targets section
```json
"targets": {
  "default": {
    "optimize": false
  }
}
```

**Purpose:** Disables Parcel's default optimizers to prevent memory issues and crashes.

## PostCSS Configuration

### CSS Comments Handling

**Location:** `.postcssrc` and `package.json` devDependencies
```json
// .postcssrc
{
  "plugins": {
    "postcss-discard-comments": { "removeAll": true },
    "@tailwindcss/postcss": {}
  }
}

// package.json
"postcss-discard-comments": "^7.0.4"
```

**Purpose:** Addresses the "Cannot read properties of undefined (reading 'input')" error from PostCSS by properly handling CSS comments.

## When to Revisit

These workarounds should be revisited when:
1. Updating Parcel to a new major version
2. Updating Tailwind CSS or PostCSS to new major versions
3. If build environments (Vercel/Netlify) change their Node.js configurations

The ideal solution would be to use standard configurations without these workarounds, but currently, they're necessary for stable builds in cloud environments. 