import { buildPagesASSETSBinding, defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import * as path from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineWorkersConfig({
    test: {
        globals: true,
        include: [
            './test/**/*.spec.ts',
            './test/**/*.test.ts'
        ],
        exclude: [
            "node_modules/**"
        ],

        poolOptions: {
            workers: {
                miniflare: {
                    compatibilityFlags: ["nodejs_compat"],
                    compatibilityDate: "2024-08-21",
                    serviceBindings: {
                        ASSETS: await buildPagesASSETSBinding(
                            path.join(__dirname, 'frontend'),
                        ),
                    }
                }
            }
        }
    },
    build: {
        tsconfig: "test/tsconfig.json",
        sourcemap: true
    },
});
