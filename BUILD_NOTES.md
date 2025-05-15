# Build Configuration Notes

Workarounds to fix build issues in cloud environments.

## Segmentation Fault (SIGSEGV) Fix

Several settings to prevent segmentation faults during builds on Vercel and Netlify:

### 1. Disabled Parcel Workers (`PARCEL_WORKERS=0`)

`package.json` build script
```json
"build": "PARCEL_WORKERS=0 NODE_OPTIONS=--max-old-space-size=1024 parcel build src/index.html"
```

Stops Parcel from using multi-threading, which causes memory issues in CI environments. Fixes those frustrating SIGSEGV crashes that happen right after the build finishes.

Parcel v2.15.0+ uses worker threads for parallelization. In memory-constrained CI environments, these workers can cause heap allocation failures leading to process termination with signal `SIGSEGV`. The error typically appears in CI logs as `Error: Command "npm run build" exited with SIGSEGV` or in Vercel as `Running "npm run build" - Build error occurred`.

### 2. Memory Limitations (`NODE_OPTIONS=--max-old-space-size=1024`)

In build script as above--caps Node.js memory to 1GB so it doesn't go crazy with crash-inducing memory usage.

This flag explicitly sets the heap limit to prevent out-of-memory crashes. Without this, Node may attempt to use more memory than available, triggering the Linux OOM (Out Of Memory) killer or causing segmentation faults.

### 3. Disabled CSS Optimizers

**Location:** `.parcelrc`
```json
"optimizers": {
  "*.css": []
}
```

Completely turns off Parcel's CSS optimizers (mostly LightningCSS) which kept contributing to segfaults/build issues. Otherwise it uses LightningCSS (a Rust-based CSS parser and minifier) via WebAssembly, which is prone to memory corruption issues when processing complex CSS from Tailwind. The empty array `[]` disables the default `@parcel/optimizer-css` entirely. Error signatures include `SIGSEGV` after successful CSS processing or failures specifically with `path*.css` files in the build output.

### 4. Optimization Disabled in Targets

**Location:** `package.json` targets section
```json
"targets": {
  "default": {
    "optimize": false
  }
}
```

Turns off Parcel's optimizers to prevent memory issues. Disables minification, tree-shaking, and scope hoisting—all of which can trigger Parcel's internal issues with CSS processing and memory management. This forces Parcel to use simpler transforms that are less likely to trigger the WASM-related memory corruption in LightningCSS.

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

Addresses the "Cannot read properties of undefined (reading 'input')" error from PostCSS. 

Adding `postcss-discard-comments` with explicit configuration ensures comments are processed correctly before they reach stages where the error would occur. The error signature is `PostCSS error: Cannot read properties of undefined (reading 'input')` or similar stack traces involving comment parsing.

## When to Revisit
1. Upgrading Parcel to a new major version
2. Upgrading Tailwind/PostCSS
3. If Vercel/Netlify change their Node setup

The ideal solution would be to use standard configurations without these workarounds, but currently, they're necessary for stable builds in cloud environments. 