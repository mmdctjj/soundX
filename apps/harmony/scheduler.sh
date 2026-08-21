#!/bin/bash

# AudioDock HarmonyOS 开发调度脚本
# 每3分钟轮询一次，分配未完成的任务给开发 agent

PROJECT_DIR="$HOME/documents/projects/AudioDock/apps/harmony"
WORKFLOW_FILE="$PROJECT_DIR/WORKFLOW_HARMONY.md"
LOG_FILE="$PROJECT_DIR/.scheduler.log"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查任务状态
check_task_status() {
    local task_name="$1"
    # 检查 git log 中是否有该任务的 commit
    cd "$PROJECT_DIR"
    if git log --oneline -20 | grep -q "$task_name"; then
        echo "completed"
    else
        echo "pending"
    fi
}

# 分配任务给开发 agent
assign_task() {
    local task_id="$1"
    local task_name="$2"
    local task_file="$3"
    local task_ref="$4"
    local task_desc="$5"
    
    log "${YELLOW}分配任务: $task_id - $task_name${NC}"
    
    # 构建 agent 指令
    local agent_instruction=$(cat <<EOF
你是专业鸿蒙 ArkTS 开发工程师。请实现 AudioDock HarmonyOS 应用的页面。

任务: $task_id - $task_name

要求:
1. 创建/修改文件: $PROJECT_DIR/products/entry/src/main/ets/pages/$task_file
2. 参考 mobile 代码: ~/documents/projects/AudioDock/apps/mobile/app/$task_ref
3. 复用已有工具类: 
   - HttpClient.ets (~/documents/projects/AudioDock/apps/harmony/products/entry/src/main/ets/utils/HttpClient.ets)
   - StorageManager.ets (~/documents/projects/AudioDock/apps/harmony/products/entry/src/main/ets/utils/StorageManager.ets)
   - ApiService.ets (~/documents/projects/AudioDock/apps/harmony/products/entry/src/main/ets/utils/ApiService.ets)
4. 遵循 ArkTS 严格模式:
   - 不使用 any/unknown 类型
   - 不使用解构赋值
   - 不使用 URLSearchParams
   - catch 块不用 catch (error: any)
   - 对象字面量对应显式声明的类或接口
   - 所有 import 在文件顶部
5. 页面功能与 mobile 保持一致
6. 图标不一致时可替换
7. 实现后更新 main_pages.json 添加页面路由
8. 编译通过: cd $PROJECT_DIR && export DEVECO_SDK_HOME="$HOME/.audiodock/sdk" && export OHOS_BASE_SDK_HOME="$HOME/.audiodock/sdk" && export PATH="/Applications/DevEco-Studio.app/Contents/tools/hvigor/bin:/Applications/DevEco-Studio.app/Contents/tools/ohpm/bin:\$PATH" && hvigorw assembleHap --no-daemon --no-build-cache
9. 编译成功后: cd $PROJECT_DIR && git add -A && git commit -m "feat(harmony): $task_id - $task_name

$task_desc"

注意事项:
- mobile 使用 React Native + Expo, 鸿蒙使用 ArkTS + ArkUI
- 将 React Native JSX 转换为 ArkTS 声明式 UI
- 路由使用 router.pushUrl({ url: 'pages/PageName' })
- 状态管理使用 @State
- 列表使用 List + ForEach 或 Scroll + Row/Column

请先读取参考的 mobile 代码文件，然后实现鸿蒙版本。
EOF
)
    
    # 通过 openclaw 发送消息给开发 agent
    echo "$agent_instruction"
}

# 主循环
main() {
    log "${GREEN}调度器启动${NC}"
    
    # 定义任务列表
    declare -a TASKS=(
        "Task1|MainPage|MainPage.ets|(tabs)/_layout.tsx|底部 Tab 导航框架，包含首页/音乐库/个人中心三个 Tab"
        "Task2|LibraryPage|LibraryPage.ets|(tabs)/library.tsx|音乐库页面，包含全部专辑/艺人/曲目/最近播放"
        "Task3|PersonalPage|PersonalPage.ets|(tabs)/personal.tsx|个人中心页面，包含用户信息/设置/数据源切换"
        "Task4|AlbumDetailPage|AlbumDetailPage.ets|album/[id].tsx|专辑详情页，包含曲目列表/播放全部"
        "Task5|ArtistDetailPage|ArtistDetailPage.ets|artist/[id].tsx|艺人详情页，包含专辑列表/热门曲目"
        "Task6|PlayerPage|PlayerPage.ets|player.tsx|播放器页面，包含播放控制/进度条/歌词"
        "Task7|SearchPage|SearchPage.ets|search.tsx|搜索页面，包含搜索框/搜索历史/搜索结果"
        "Task8|SettingsPage|SettingsPage.ets|settings.tsx|设置页面，包含主题/播放设置/清除缓存"
        "Task9|SourceManagePage|SourceManagePage.ets|source-manage.tsx|数据源管理页面，支持切换/编辑/删除"
    )
    
    # 检查每个任务状态
    for task in "${TASKS[@]}"; do
        IFS='|' read -r task_id task_name task_file task_ref task_desc <<< "$task"
        
        status=$(check_task_status "$task_name")
        
        if [ "$status" = "pending" ]; then
            log "${YELLOW}发现待完成任务: $task_id - $task_name${NC}"
            assign_task "$task_id" "$task_name" "$task_file" "$task_ref" "$task_desc"
            # 只分配一个任务，然后退出等待下次轮询
            log "${GREEN}任务已分配，等待下次轮询${NC}"
            exit 0
        else
            log "${GREEN}任务已完成: $task_id - $task_name${NC}"
        fi
    done
    
    log "${GREEN}所有任务已完成！${NC}"
}

main "$@"
