/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ...(process.env.npm_lifecycle_event === 'build' ? { SKIP_ENV_VALIDATION: 'true' } : {}),
  },
  experimental: {
    serverComponentsExternalPackages: ['unpdf', 'mammoth', 'officeparser']
  }
};

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
