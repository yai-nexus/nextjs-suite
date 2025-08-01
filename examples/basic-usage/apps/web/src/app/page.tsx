import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plugin Support Basic Example',
  description: '展示 @yai-nextjs/plugin-support 基础用法的示例应用',
};

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">
        Plugin Support Basic Example
      </h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Blog Plugin</h2>
          <p className="text-gray-600 mb-4">
            测试博客插件的 API 端点
          </p>
          <div className="space-y-2">
            <p className="font-mono text-sm">GET /api/blog/posts</p>
            <p className="font-mono text-sm">POST /api/blog/posts</p>
            <p className="font-mono text-sm">GET /api/blog/posts/:id</p>
            <p className="font-mono text-sm">PUT /api/blog/posts/:id</p>
            <p className="font-mono text-sm">DELETE /api/blog/posts/:id</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">User Plugin</h2>
          <p className="text-gray-600 mb-4">
            测试用户插件的 API 端点
          </p>
          <div className="space-y-2">
            <p className="font-mono text-sm">GET /api/users</p>
            <p className="font-mono text-sm">POST /api/users</p>
            <p className="font-mono text-sm">GET /api/users/:id</p>
            <p className="font-mono text-sm">PUT /api/users/:id</p>
            <p className="font-mono text-sm">DELETE /api/users/:id</p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">API 测试</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="mb-2">打开浏览器开发者工具的网络面板，然后点击下面的按钮测试 API：</p>
          <div className="space-x-2">
            <button
              onClick={() => fetch('/api/blog/posts').then(r => r.json()).then(console.log)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              测试获取博客
            </button>
            <button
              onClick={() => fetch('/api/users').then(r => r.json()).then(console.log)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              测试获取用户
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}