import { appState } from "@/lib/context.js";
import type { DevArgs, VirtualFileRegistry } from "@/types/index.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer } from "ws";
import { watch } from "chokidar";
import { buildSite } from "./build.js";
import path from "path";
import { logger } from "@/lib/index.js";
import { DIST_DIRNAME, distDir } from "@/constants.js";
import { traverseRecursive } from "@/utils/index.js";
import { existsSync, readFileSync } from "fs";
import mime from "mime-types";


const wsInjection = `<script>
(() => {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const url = \`\${protocol}//\${location.host}\`;

  function connect() {
    const ws = new WebSocket(url);

    ws.addEventListener("message", ({ data }) => {
      if (data === "reload") {
        location.reload();
      }
    });

    ws.addEventListener("close", () => {
      setTimeout(connect, 1000);
    });

    ws.addEventListener("error", () => {
      ws.close();
    });
  }

  connect();
})();
</script>`;

export default async function dev(): Promise<void> {
  const state = appState.getState();
  const { directory, port } = state.options as DevArgs;

  const virtualFileRegistry: VirtualFileRegistry = new Map();

  const server = createServer(devHandler({ virtualFileRegistry }));
  const wss = new WebSocketServer({ server });

  const watcher = watch(directory, {
    ignored: state.shouldIgnore,
    ignoreInitial: true,
  });

  // initial population
  await buildVirtualFileRegistry(directory, state, virtualFileRegistry);
  logger.log(
    `Registry keys: ${Array.from(virtualFileRegistry.keys()).sort().join("\n")}`,
    "info",
  );

  let timeout: ReturnType<typeof setTimeout>;

  watcher.on("all", (_event, _path) => {
    clearTimeout(timeout);

    timeout = setTimeout(async () => {
      virtualFileRegistry.clear();
      await buildVirtualFileRegistry(directory, state, virtualFileRegistry);


      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send("reload");
        }
      });
    }, 300);
  });

  server.listen(port, () => {
    console.log(`Development server running at http://localhost:${port}`);
  });

  return Promise.resolve();
}

async function buildVirtualFileRegistry(
  directory: string,
  state: ReturnType<typeof appState.getState>,
  virtualFileRegistry: VirtualFileRegistry,
): Promise<VirtualFileRegistry> {
  const targetDist = path.join(
    directory,
    state.finalConfig.outDir || DIST_DIRNAME,
  );

  await buildSite(
    { directory, interactive: false },
    state,
    async (filePath, content, contentType) => {
      virtualFileRegistry.set(path.join('/', path.relative(targetDist, filePath)), { content, contentType });
    },
  );

  if (state.finalConfig.publicPath) {
    const publicDir = path.join(directory, state.finalConfig.publicPath);
    if (!existsSync(publicDir)) {
      logger.log(
        `Public directory ${publicDir} does not exist. Skipping public file registration.`,
        "warn",
      );
    } else {
      logger.log(`Registering public files from ${publicDir}`, "info");
    }

    await traverseRecursive(publicDir, async (filePath) => {
      const relativePath = path.relative(publicDir, filePath);
      const virtualPath = path.join("/", relativePath);

      const contentType =
        mime.lookup(filePath) || "application/octet-stream";

      virtualFileRegistry.set(virtualPath, {
        content: () => {
          const buffer: Buffer = readFileSync(filePath);
          const value = {
            content: buffer,
            contentType,
          };

          // store shit if it's less than 10MB, otherwise just serve it from disk
          if (buffer.byteLength / (1024 * 1024) < 10) {
            virtualFileRegistry.set(virtualPath, value);
          }

          return value;
        },
        contentType,
      });
    });
  }

  if (distDir)
    await traverseRecursive(distDir, async (filePath) => {
      const relativePath = path.relative(distDir, filePath);
      const virtualPath = path.join("/", relativePath);

      const contentType =
        mime.lookup(filePath) || "application/octet-stream";

      virtualFileRegistry.set(virtualPath, {
        content: () => {
          const buffer: Buffer = readFileSync(filePath);
          const value = {
            content: buffer,
            contentType,
          };

          if (buffer.byteLength / (1024 * 1024) < 10) {
            virtualFileRegistry.set(virtualPath, value);
          }

          return value;
        },
        contentType,
      });
    });
  
  // //prepending baseurl to every route
  // const baseUrl = state.finalConfig.baseRoute || "/";
  // for (const [key, value] of virtualFileRegistry.entries()) {
  //   virtualFileRegistry.set(path.join(baseUrl, key), value);
  // }

  return virtualFileRegistry;
}

function devHandler(context: { virtualFileRegistry: VirtualFileRegistry }) {
  const { virtualFileRegistry } = context;
  const state = appState.getState();
  const baseUrl = state.finalConfig.baseRoute || "/";

  return (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage> & {
      req: IncomingMessage;
    },
  ) => {
    if (!req.url) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("400 Bad Request: Missing URL");
      return;
    }

    logger.log(`Incoming request: ${req.url}`, "info");

    if (!req.url.startsWith(baseUrl)) {
      logger.log(
        `Redirecting request for ${req.url} to ${path.join(baseUrl, req.url)}`,
        "warn",
      );
      res.writeHead(301, { "Content-Type": "text/plain", "Location": path.join(baseUrl, req.url) });
      res.end("Site's baseRoute is set to " + baseUrl);
      return;
    }

    const relativeRequestUrl = req.url.slice(baseUrl.length) || "/";


    const possibleFilePaths = [
      relativeRequestUrl,
      relativeRequestUrl + '.html',
      path.join(relativeRequestUrl, "index.html"),
    ];

    logger.log(
      `Resolved file paths: ${possibleFilePaths.join(", ")}`,
      "info",
    );

    const matchedFilePath = possibleFilePaths.find((filePath) => {
      if (virtualFileRegistry.has(filePath)) 
        return true;
    });
    const registryValue = matchedFilePath ? virtualFileRegistry.get(matchedFilePath) : undefined;

    if (registryValue && matchedFilePath!) {
      res.setHeader(
        "Content-Type",
        mime.lookup(matchedFilePath) || "application/octet-stream",
      );

      if(registryValue.content instanceof Function) {
        const value = registryValue.content();
        res.end(value.content);
      } else {
        res.end(registryValue.content);
      }

      return;
    }

    res.writeHead(404, {
      "Content-Type": "text/plain",
      "cache-control": "no-cache",
    });
    res.end("404 Not Found");
  };
}
