#!/bin/bash

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Folo 本地开发环境设置                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# 检查 Node.js 版本
check_nodejs() {
    echo -e "${YELLOW}检查 Node.js 版本...${NC}"
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 未找到 Node.js，请先安装 Node.js 18+${NC}"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}错误: Node.js 版本过低 (当前: $(node -v)，需要: 18+)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
}

# 检查 pnpm 版本
check_pnpm() {
    echo -e "${YELLOW}检查 pnpm 版本...${NC}"
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}未找到 pnpm，正在安装...${NC}"
        npm install -g pnpm
    fi

    PNPM_VERSION=$(pnpm -v | cut -d'.' -f1)
    if [ "$PNPM_VERSION" -lt 10 ]; then
        echo -e "${YELLOW}pnpm 版本较低，建议升级到 10+${NC}"
    fi
    echo -e "${GREEN}✓ pnpm 版本: $(pnpm -v)${NC}"
}

# 复制环境变量文件
setup_env_files() {
    echo -e "${YELLOW}设置环境变量文件...${NC}"

    # Desktop 应用
    if [ ! -f "$PROJECT_ROOT/apps/desktop/.env" ]; then
        cp "$PROJECT_ROOT/apps/desktop/.env.example" "$PROJECT_ROOT/apps/desktop/.env"
        echo -e "${GREEN}✓ 创建 apps/desktop/.env${NC}"
    else
        echo -e "${BLUE}⊙ apps/desktop/.env 已存在${NC}"
    fi

    # SSR 服务
    if [ ! -f "$PROJECT_ROOT/apps/ssr/.env" ]; then
        cp "$PROJECT_ROOT/apps/ssr/.env.example" "$PROJECT_ROOT/apps/ssr/.env"
        echo -e "${GREEN}✓ 创建 apps/ssr/.env${NC}"
    else
        echo -e "${BLUE}⊙ apps/ssr/.env 已存在${NC}"
    fi

    # CLI 工具
    if [ ! -f "$PROJECT_ROOT/apps/cli/.env" ]; then
        cp "$PROJECT_ROOT/apps/cli/.env.example" "$PROJECT_ROOT/apps/cli/.env"
        echo -e "${GREEN}✓ 创建 apps/cli/.env${NC}"
    else
        echo -e "${BLUE}⊙ apps/cli/.env 已存在${NC}"
    fi
}

# 选择 API 环境
select_api_environment() {
    echo ""
    echo -e "${YELLOW}请选择 API 环境:${NC}"
    echo -e "${BLUE}1)${NC} 本地 API 服务器 (http://localhost:3000)"
    echo -e "${BLUE}2)${NC} 开发环境 (https://api.dev.follow.is)"
    echo -e "${BLUE}3)${NC} 生产环境 (https://api.folo.is)"
    echo -e "${BLUE}4)${NC} 保持不变"
    echo -n "请输入选项 [1-4]: "

    read -r choice

    case $choice in
        1)
            API_URL="http://localhost:3000"
            ;;
        2)
            API_URL="https://api.dev.follow.is"
            ;;
        3)
            API_URL="https://api.folo.is"
            ;;
        4)
            echo -e "${BLUE}⊙ 保持现有配置${NC}"
            return
            ;;
        *)
            echo -e "${RED}无效选项，保持现有配置${NC}"
            return
            ;;
    esac

    # 更新 Desktop .env
    if [ -f "$PROJECT_ROOT/apps/desktop/.env" ]; then
        sed -i.bak "s|VITE_API_URL=.*|VITE_API_URL=$API_URL|" "$PROJECT_ROOT/apps/desktop/.env"
        rm -f "$PROJECT_ROOT/apps/desktop/.env.bak"
        echo -e "${GREEN}✓ 更新 apps/desktop/.env (API: $API_URL)${NC}"
    fi

    # 更新 SSR .env
    if [ -f "$PROJECT_ROOT/apps/ssr/.env" ]; then
        sed -i.bak "s|VITE_API_URL=.*|VITE_API_URL=$API_URL|" "$PROJECT_ROOT/apps/ssr/.env"
        rm -f "$PROJECT_ROOT/apps/ssr/.env.bak"
        echo -e "${GREEN}✓ 更新 apps/ssr/.env (API: $API_URL)${NC}"
    fi

    # 更新 CLI .env
    if [ -f "$PROJECT_ROOT/apps/cli/.env" ]; then
        sed -i.bak "s|FOLO_API_URL=.*|FOLO_API_URL=$API_URL|" "$PROJECT_ROOT/apps/cli/.env"
        rm -f "$PROJECT_ROOT/apps/cli/.env.bak"
        echo -e "${GREEN}✓ 更新 apps/cli/.env (API: $API_URL)${NC}"
    fi
}

# 安装依赖
install_dependencies() {
    echo ""
    echo -e "${YELLOW}安装项目依赖...${NC}"
    cd "$PROJECT_ROOT"
    pnpm install
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
}

# 构建包
build_packages() {
    echo ""
    echo -e "${YELLOW}构建包...${NC}"
    cd "$PROJECT_ROOT"
    pnpm build:packages
    echo -e "${GREEN}✓ 包构建完成${NC}"
}

# 显示下一步操作
show_next_steps() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           设置完成！                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}下一步操作:${NC}"
    echo ""
    echo -e "  ${YELLOW}启动开发服务器:${NC}"
    echo -e "    ${GREEN}pnpm dev:web${NC}         # 启动 Web 应用 + SSR"
    echo ""
    echo -e "  ${YELLOW}或使用脚本:${NC}"
    echo -e "    ${GREEN}./scripts/dev.sh${NC}       # 启动开发环境"
    echo ""
    echo -e "  ${YELLOW}其他命令:${NC}"
    echo -e "    ${GREEN}pnpm dev:electron${NC}     # 启动 Electron 应用"
    echo -e "    ${GREEN}cd apps/cli && pnpm cli login${NC}  # CLI 登录"
    echo ""
    echo -e "${BLUE}配置文件位置:${NC}"
    echo -e "    apps/desktop/.env"
    echo -e "    apps/ssr/.env"
    echo -e "    apps/cli/.env"
    echo ""
}

# 主函数
main() {
    check_nodejs
    check_pnpm
    setup_env_files
    select_api_environment
    install_dependencies
    build_packages
    show_next_steps
}

# 运行主函数
main
