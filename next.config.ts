import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用静态导出
  output: 'export',
  
  // 图片优化
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  
  // 压缩输出
  compress: true,
  
  // 减少包体积
  swcMinify: true,
  
  // 预设优化
  experimental: {
    optimizeCss: true,
  },
  
  // 设置响应头缓存
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
