    // English source keys keep unknown Host errors and plugin names intact.
    const REMOTE_LOCALE_NS = 'dsh-ssh-workspace'
    const WORKSPACE_LOCALE_NS = 'dsh-ssh-workspace.workspace'
    const remoteZh = {
      "Remote Desktop": "远端桌面",
      "Workspace": "工作区",
      "Untitled session": "未命名会话",
      "Home": "主目录",
      "Add workspace…": "添加工作区…",
      "Add workspace": "添加工作区",
      "Close": "关闭",
      "Cancel": "取消",
      "Local workspace": "本地工作区",
      "Remote workspace": "远端工作区",
      "Choose where the workspace should live.": "选择工作区所在的位置。",
      "Use the official picker for this DSH instance.": "使用当前 DSH 的文件夹选择器。",
      "Ask the main host to create one on a connected remote.": "通过主机在已连接的远端创建工作区。",
      "Create one on a connected remote host.": "在已连接的远端主机上创建工作区。",
      "Local directory picker is unavailable in this profile.": "当前配置无法使用本地文件夹选择器。",
      "Remote workspace setup requires the main host bridge.": "创建远端工作区需要主机桥接连接。",
      "Remote workspace setup timed out.": "创建远端工作区超时。",
      "Remote workspace setup failed": "创建远端工作区失败",
      "Cannot reorder remote workspaces across sources": "无法跨主机调整远端工作区顺序",
      "Cannot reorder local workspaces into a remote source": "无法将本地工作区移动到远端主机",
      "Cannot reorder sessions across sources": "无法跨主机调整会话顺序",
      "Connect a remote host before adding a remote workspace.": "请先连接远端主机，再添加远端工作区。",
      "Choose a remote directory before adding a workspace.": "请先选择远端文件夹，再添加工作区。",
      "No connected hosts": "暂无已连接的主机",
      "Add remote workspace": "添加远端工作区",
      "Choose a connected host and browse to the remote folder to use as a workspace.": "选择已连接的主机，并选择用作工作区的远端文件夹。",
      "Adding…": "正在添加…",
      "Create workspace here": "在此创建工作区",
      "Host": "主机",
      "Connect a host in Settings → Remote Desktop before creating a remote workspace.": "请先在“设置 → 远端桌面”中连接主机，再创建远端工作区。",
      "Show hidden": "显示隐藏文件夹",
      "Loading remote folders…": "正在加载远端文件夹…",
      "Cannot read this directory.": "无法读取此文件夹。",
      "Retry": "重试",
      "No folders in this directory.": "此目录下没有文件夹。",
      "Connected.": "已连接。",
      "Disconnected.": "已断开。",
      "SSH Hosts": "SSH 主机",
      "No concrete Host entries were found in ~/.ssh/config.": "未在 ~/.ssh/config 中找到具体的主机配置。",
      "Connected": "已连接",
      "Connecting": "正在连接",
      "Connection failed": "连接失败",
      "Not connected": "未连接",
      "Connecting…": "正在连接…",
      "Connect": "连接",
      "Disconnecting…": "正在断开…",
      "Disconnect": "断开连接",
      "Connect to create a forwarded DSH Web URL for this Host.": "连接后将为此主机创建转发的 DSH 网页地址。",
      "Use DSH on SSH Hosts from the same Workspace browser. Connected Hosts open in place; native DSH remains available in a separate tab.": "在同一工作区列表中使用 SSH 主机上的 DSH。连接后可直接打开远端会话，也可在独立标签页中打开原始 DSH 界面。",
      "Checking environment": "正在检查环境",
      "Installing DSH": "正在安装 DSH",
      "Stopping managed DSH": "正在停止托管的 DSH",
      "Synchronizing plugins": "正在同步插件",
      "Starting DSH": "正在启动 DSH",
      "Verifying remote DSH": "正在验证远端 DSH",
      "Remote host {name}": "远端主机 {name}",
      "Remote dsh {name}": "远端 DSH {name}",
      "Open {name}": "打开 {name}",
      "{n} Host": "{n} 台主机",
      "{n} Hosts": "{n} 台主机",
      "remote bridge closed": "远端桥接连接已关闭",
      "remote bridge for {name} is not ready": "远端主机 {name} 的桥接连接尚未就绪",
      "remote bridge for {name} does not support {method}": "远端主机 {name} 的桥接连接不支持 {method}"
    }
    const remoteEn = Object.fromEntries(Object.keys(remoteZh).map(key => [key, key]))
    let localeService
    let remoteTranslate = (key, args) => interpolateLocale(key, args)
    let workspaceTranslate = (key, args) => interpolateLocale(OfficialWorkspace.en[key] ?? key, args)
    function interpolateLocale(text, args) {
      return text.replace(/\{(\w+)\}/g, (match, name) => args && name in args ? String(args[name]) : match)
    }
    function remoteT(key, args) { return remoteTranslate(key, args) }
    function useRemoteLocale() {
      useSyncExternalStore(localeService.subscribe, localeService.getSnapshot)
      return remoteT
    }
    function installRemoteLocale(ctx) {
      ctx.effect(() => {
        const locale = ctx.locale
        const disposeRemote = locale.register(REMOTE_LOCALE_NS, { zh: remoteZh, en: remoteEn })
        const disposeWorkspace = locale.register(WORKSPACE_LOCALE_NS, { zh: OfficialWorkspace.zh, en: OfficialWorkspace.en })
        // LocaleFace methods use their receiver; React calls store callbacks bare.
        localeService = {
          subscribe: listener => locale.subscribe(listener),
          getSnapshot: () => locale.getSnapshot(),
        }
        remoteTranslate = locale.bind(REMOTE_LOCALE_NS)
        workspaceTranslate = locale.bind(WORKSPACE_LOCALE_NS)
        return () => { disposeWorkspace(); disposeRemote() }
      }, 'dsh-ssh-workspace: language dictionaries')
    }
