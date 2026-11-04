---
'octane': patch
'@octanejs/cli': patch
'@octanejs/mcp-server': patch
'@octanejs/lynx': patch
---

Add `useSnapshot(() => value)` to capture an initial value for rendering.
The hook keeps the same value across renders and creates a fresh snapshot on
remount. Strong mode checks the initializer and treats its result as an
immutable render snapshot.
