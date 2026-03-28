import { MotionButtonBase } from "@follow/components/ui/button/index.js"

import { setLoginModalShow } from "~/atoms/user"

export function Component() {
  const handleShowLogin = () => {
    setLoginModalShow(true)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl rounded-2xl bg-white p-12 shadow-2xl dark:bg-gray-800">
        <h1 className="mb-6 text-4xl font-bold text-gray-900 dark:text-white">Folo 开发环境</h1>

        <div className="space-y-4 text-lg text-gray-600 dark:text-gray-300">
          <p>欢迎使用 Folo 标注系统开发环境！</p>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-gray-700">
            <h2 className="mb-2 text-xl font-semibold text-blue-900 dark:text-blue-300">
              当前状态
            </h2>
            <ul className="list-inside list-disc space-y-1">
              <li>✅ Web 应用运行在 http://localhost:2236</li>
              <li>✅ 标注系统已完全实现</li>
              <li>✅ 所有组件已集成</li>
            </ul>
          </div>

          <div className="rounded-lg bg-yellow-50 p-4 dark:bg-gray-700">
            <h2 className="mb-2 text-xl font-semibold text-yellow-900 dark:text-yellow-300">
              下一步操作
            </h2>
            <ol className="list-inside list-decimal space-y-1">
              <li>点击下方按钮登录</li>
              <li>使用邮箱注册或登录</li>
              <li>订阅一些 RSS feeds</li>
              <li>在文章中测试标注功能</li>
            </ol>
          </div>

          <div className="pt-4">
            <MotionButtonBase
              onClick={handleShowLogin}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              登录 / 注册 Folo 账号
            </MotionButtonBase>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-700">
            <p className="font-semibold text-gray-700 dark:text-gray-300">标注功能说明：</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600 dark:text-gray-400">
              <li>选择文字后显示工具栏</li>
              <li>5种颜色高亮：黄、绿、蓝、粉、橙</li>
              <li>支持添加 Markdown 笔记</li>
              <li>侧边栏管理所有标注</li>
              <li>支持导出为 JSON/Markdown</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
