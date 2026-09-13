import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * O turbopack.root fica fixo na pasta do projeto. Sem isso o Next procura
 * package-lock.json nos diretorios acima e, com o projeto dentro do OneDrive,
 * acaba achando um lock file de outra pasta.
 */
const raiz = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: { root: raiz },
};

export default nextConfig;
