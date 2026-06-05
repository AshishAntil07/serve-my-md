# smm.config.json

Place `smm.config.json` at docs root.

Defaults are merged with your overrides.

Default values come from the CLI's built-in config at `cli/src/smm.config.json`.

This is the complete schema:

```typescript
export interface SmmConfig {
  rootTitle?: string;
  description?: string;
  markdownItOptions?: Record<string, any>;
  baseRoute?: string;
  publicPath?: string;
  defaultTheme?: string;
  favicon?: string;
  logo?: string;
  name?: string;
  showNameWithLogo?: boolean;
  og?: OpenGraph;
  sortRoutes?: boolean;
  trimIndexFromPath?: boolean;
  version?: string;
  fonts?: {
    title?: {
      name: string;
      url?: string;
    };
    body?: {
      name: string;
      url?: string;
    };
    mono?: {
      name: string;
      url?: string;
    };
  };
}
```

Read next:

- [Defaults and Options](/smm-config/defaults-and-options)
- [Trim and Ordering](/smm-config/trim-and-ordering)
