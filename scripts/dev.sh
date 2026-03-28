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

# 帮助信息
show_help() {
    cat << EOF
${BLUE}Folo 开发环境启动脚本${NC}

用法: $(basename "$0") [选项]

选项:
    -h, --help          显示此帮助信息
    -w, --web           启动 Web 应用 (端口: 2233)
    -e, --electron      启动 Electron 应用
    -s, --ssr           启动 SSR 服务 (端口: 2234)
    -a, --all           启动所有服务 (Web + SSR)
    --no-build          跳过包构建
    --port WEB_PORT     指定 Web 端口 (默认: 2233)

示例:
    $(basename "$0")              # 启动 Web + SSR (默认)
    $(basename "$0") -w           # 仅启动 Web 应用
    $(basename "$0") -e           # 启动 Electron 应用
    $(basename "$0") -a           # 启动所有服务

EOF
}

# 默认参数
START_WEB=true
START_SSR=true
START_ELECTRON=false
SKIP_BUILD=false
WEB_PORT=2233

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -w|--web)
            START_WEB=true
            START_SSR=false
            shift
            ;;
        -e|--electron)
            START_WEB=false
            START_SSR=false
            START_ELECTRON=true
            shift
            ;;
        -s|--ssr)
            START_WEB=false
            START_SSR=true
            shift
            ;;
        -a|--all)
            START_WEB=true
            START_SSR=true
            shift
            ;;
        --no-build)
            SKIP_BUILD=true
            shift
            ;;
        --port)
            WEB_PORT="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 检查环境
check_environment() {
    echo -e "${YELLOW}检查环境...${NC}"

    if [ ! -f "$PROJECT_ROOT/apps/desktop/.env" ]; then
        echo -e "${RED}错误: 未找到 apps/desktop/.env${NC}"
        echo -e "${YELLOW}请先运行: ./scripts/setup-local.sh${NC}"
        exit 1
    fi

    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        echo -e "${RED}错误: 未安装依赖${NC}"
        echo -e "${YELLOW}请先运行: ./scripts/setup-local.sh${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ 环境检查通过${NC}"
}

# 构建包
build_packages() {
    if [ "$SKIP_BUILD" = true ]; then
        echo -e "${BLUE}⊙ 跳过包构建${NC}"
        return
    fi

    echo -e "${YELLOW}构建包...${NC}"
    cd "$PROJECT_ROOT"
    pnpm build:packages
    echo -e "${GREEN}✓ 包构建完成${NC}"
}

# 启动 SSR 服务
start_ssr() {
    echo -e "${YELLOW}启动 SSR 服务...${NC}"
    cd "$PROJECT_ROOT/apps/ssr"
    pnpm dev &
    SSR_PID=$!
    echo -e "${GREEN}✓ SSR 服务已启动 (PID: $SSR_PID)${NC}"
}

# 启动 Web 应用
start_web() {
    echo -e "${YELLOW}启动 Web 应用...${NC}"
    cd "$PROJECT_ROOT/apps/desktop"

    # 设置端口
    export PORT=$WEB_PORT

    pnpm dev:web &
    WEB_PID=$!
    echo -e "${GREEN}✓ Web 应用已启动 (PID: $WEB_PID, 端口: $WEB_PORT)${NC}"
}

# 启动 Electron 应用
start_electron() {
    echo -e "${YELLOW}启动 Electron 应用...${NC}"
    cd "$PROJECT_ROOT/apps/desktop"
    pnpm dev:electron
}

# 显示启动信息
show_banner() {
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Folo 开发环境启动中...                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 显示访问信息
show_access_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           服务已启动！                         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$START_WEB" = true ]; then
        echo -e "${BLUE}Web 应用:${NC}"
        echo -e "    ${GREEN}http://localhost:$WEB_PORT${NC}"
        echo ""
    fi

    if [ "$START_SSR" = true ]; then
        echo -e "${BLUE}SSR 服务:${NC}"
        echo -e "    ${GREEN}http://localhost:2234${NC}"
        echo ""
    fi

    echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
    echo ""

    # 保存 PID 用于清理
    if [ -n "$SSR_PID" ]; then
        echo $SSR_PID > /tmp/folo-ssr.pid
    fi
    if [ -n "$WEB_PID" ]; then
        echo $WEB_PID > /tmp/folo-web.pid
    fi
}

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}正在停止服务...${NC}"

    if [ -f /tmp/folo-ssr.pid ]; then
        kill $(cat /tmp/folo-ssr.pid) 2>/dev/null || true
        rm -f /tmp/folo-ssr.pid
    fi

    if [ -f /tmp/folo-web.pid ]; then
        kill $(cat /tmp/folo-web.pid) 2>/dev/null || true
        rm -f /tmp/folo-web.pid
    fi

    # 清理所有子进程
    pkill -P $$ 2>/dev/null || true

    echo -e "${GREEN}✓ 服务已停止${NC}"
    exit 0
}

# 设置陷阱
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    show_banner
    check_environment
    build_packages

    if [ "$START_ELECTRON" = true ]; then
        start_electron
        return
    fi

    if [ "$START_SSR" = true ]; then
        start_ssr
        sleep 2
    fi

    if [ "$START_WEB" = true ]; then
        start_web
    fi

    if [ "$START_WEB" = true ] || [ "$START_SSR" = true ]; then
        show_access_info
        wait
    fi
}

# 运行主函数
main
