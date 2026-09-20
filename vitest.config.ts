import path from "node:path";
import { buildPagesASSETSBinding, cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	plugins: [
		cloudflareTest(async () => {
			const assetsPath = path.join(__dirname, "frontend");

			return {
				miniflare: {
                    compatibilityFlags: ["nodejs_compat"],
                    compatibilityDate: "2024-08-21",
					serviceBindings: {
						ASSETS: await buildPagesASSETSBinding(assetsPath),
					},
				},
			};
		}),
	],
});