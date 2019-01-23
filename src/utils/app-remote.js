import electron, {
  BrowserWindow, app as ElectronApp, Tray, Menu, nativeImage, globalShortcut, ipcMain, dialog
} from 'electron'
import Lang from './lang'
import EVENT from './remote-events'
import events from './events'
import config from '../config'

if (typeof DEBUG === 'undefined') {
  global.DEBUG = process.env.NODE_ENV === 'debug' || process.env.NODE_ENV === 'development'
} else {
  global.DEBUG = DEBUG // eslint-disable-line
}

/**
 * 应用窗口索引
 * @type {number}
 * @private
 */
let appWindowIndex = 0 // eslint-disable-line

/**
 * 是否是 Mac OS 系统
 * @type {boolean}
 * @private
 */
const IS_MAC_OSX = process.platform === 'darwin' // eslint-disable-line

/**
 * 是否显示调试日志信息
 * @type {boolean}
 * @private
 */
const SHOW_LOG = DEBUG // eslint-disable-line

if (DEBUG && process.type === 'renderer') { // eslint-disable-line
  console.error('AppRemote must run in main process.')
}

class AppRemote {
  /**
   * 创建一个主进程运行时管理类实例
   * @memberof AppRemote
   */
  constructor () {
    /**
     * 保存打开的所有窗口实例
     * @type {Object<string, BrowserWindow>}
     */
    this.windows = {}

    /**
     * 保存应用运行时配置
     * @type {Object}
     */
    this.appConfig = {}

    // 绑定渲染进程请求退出事件
    ipcMain.on(EVENT.app_quit, () => {
      this.quit()
    })

    // 绑定与渲染进程通信事件
    ipcMain.on(EVENT.remote, (e, method, callBackEventName, ...args) => {
      let result = this[method]
      if (typeof result === 'function') {
        result = result.call(this, ...args)
      }

      if (method === 'quit') return

      if (result instanceof Promise) {
        result.then(x => {
          try {
            e.sender.send(callBackEventName, x)
          } catch (err) {
            console.error('\n>> ERROR: Cannot send remote result to BrowserWindow.', err)
          }
          return x
        }).catch(error => {
          console.warn('Remote error', error)
        })
      } else {
        try {
          e.sender.send(callBackEventName, result)
        } catch (err) {
          console.error('\n>> ERROR: Cannot send remote result to BrowserWindow.', err)
        }
      }
      if (DEBUG) { // eslint-disable-line
        console.info('\n>> Accept remote call', `${callBackEventName}.${method}(`, args, ')')
      }
    })

    // 绑定渲染进程请求发送消息到其他窗口渲染进程事件
    ipcMain.on(EVENT.remote_send, (e, windowName, eventName, ...args) => {
      const browserWindow = this.windows[windowName]
      if (browserWindow) {
        browserWindow.webContents.send(eventName, ...args)
      }
    })

    // 绑定渲染进程请求绑定主进程事件
    ipcMain.on(EVENT.remote_on, (e, eventId, event) => {
      events.on(event, (...args) => {
        try {
          e.sender.send(eventId, ...args)
        } catch (_) {
          this.off(eventId)
          if (SHOW_LOG) {
            console.error(`\n>> Remote event '${event}' has be force removed, because window is closed.`, e)
          }
        }
      })
      // this._eventsMap[eventId] = {remote: true, id: remoteOnEventId};
      if (SHOW_LOG) console.log('\n>> REMOTE EVENT on', event, eventId)
    })

    // 绑定渲染进程请求取消绑定主进程事件
    ipcMain.on(EVENT.remote_off, (e, eventId) => {
      events.off(eventId)
      if (SHOW_LOG) console.log('\n>> REMOTE EVENT off', eventId)
    })

    // 绑定渲染进程请求触发主进程事件
    ipcMain.on(EVENT.remote_emit, (e, eventId, ...args) => {
      events.emit(eventId, ...args)
      if (SHOW_LOG) console.log('\n>> REMOTE EVENT emit', eventId)
    })

    // 绑定渲染进程通知准备就绪事件
    ipcMain.on(EVENT.app_ready, (e, windowName) => {
      if (windowName) {
        this.createTrayIcon(windowName)
      }
      if (SHOW_LOG) console.log('\n>> App ready.')
    })
  }

  // 初始化并设置 Electron 应用入口路径
  init (rootPath) {
    if (!rootPath) {
      throw new Error('Argument rootPath must be set on init app-remote.')
    }

    Object.assign(this.appConfig, config)
    this.rootPath = rootPath
  }

  /**
   * 通知主进程准备就绪并打开主界面窗口
   * @memberof AppRemote
   * @return {void}
   */
  ready () {
    this.openOrCreateWindow()
    this.createAppMenu()

    console.log('appConfig', this.appConfig)
    // 设置关于窗口
    if (IS_MAC_OSX && typeof ElectronApp.setAboutPanelOptions === 'function') {
      ElectronApp.setAboutPanelOptions({
        applicationName: Lang.title, // eslint-disable-line
        applicationVersion: this.appConfig.pkg.version,
        copyright: 'Copyright (C) 2019 bzbs.app',
        version: DEBUG ? '[debug]' : '' // eslint-disable-line
      })
    }
  }

  /**
   * 打开主窗口
   *
   * @memberof AppRemote
   * @return {void}
   */
  openOrCreateWindow () {
    const {currentFocusWindow} = this

    if (!currentFocusWindow) {
      // todo check login
      // 如果为登录，创建登录窗口，否则创建主窗口
      let isLogin = false
      if (!isLogin) {
        this.createAppWindow({
          width: 400,
          height: 650,
          minWidth: 400,
          minHeight: 650
        }, 'login')
      } else {
        this.createAppWindow({}, 'main')
      }
    } else if (!currentFocusWindow.isVisible()) {
      currentFocusWindow.show()
      currentFocusWindow.focus()
    }
  }

  /**
   * 创建应用窗口
   *
   * @param {Object} options Electron 窗口初始化选项
   * @param {String} windowName 窗口名称
   * @memberof AppRemote
   * @return {void}
   */
  createAppWindow (options, windowName) {
    const hasMainWindow = !!this.mainWindow

    if (!windowName) {
      windowName = hasMainWindow ? `main-${appWindowIndex++}` : 'main'
    }

    let winURL
    if (windowName === 'main') {
      winURL = process.env.NODE_ENV === 'development'
        ? `http://localhost:9080`
        : `file://${__dirname}/index.html`
    } else if (windowName === 'login') {
      winURL = process.env.NODE_ENV === 'development'
        ? `http://localhost:9080/#login-page`
        : `file://${__dirname}/index.html#login-page`
    }

    options = Object.assign({
      width: 900,
      height: 650,
      minWidth: 400,
      minHeight: 650,
      url: winURL,
      name: windowName,
      resizable: DEBUG, // eslint-disable-line
      debug: DEBUG // eslint-disable-line
    }, options)

    if (DEBUG && !hasMainWindow && windowName === 'main') { // eslint-disable-line
      const display = electron.screen.getPrimaryDisplay()
      options.height = display.workAreaSize.height
      options.width = 800
      options.x = display.workArea.x
      options.y = display.workArea.y
    }

    const appWindow = this.createWindow(options)

    appWindow.on('close', e => {
      if (this.markClose && this.markClose[windowName]) return
      const now = new Date().getTime()

      if (this.lastRequestCloseTime && (now - this.lastRequestCloseTime) < 3000) {
        electron.dialog.showMessageBox(appWindow, {
          buttons: [Lang.exit_sure, Lang.exit_cancel],
          defaultId: 0,
          type: 'question',
          message: Lang.exit_msg
        }, response => {
          if (response === 0) {
            setTimeout(() => {
              this.closeWindow(windowName)
            }, 0)
          }
        })
      } else {
        this.lastRequestCloseTime = now
        if (appWindow) {
          appWindow.webContents.send(EVENT.remote_app_quit)
        }
      }
      e.preventDefault()
      return false
    })

    if (!hasMainWindow && windowName === 'main') {
      /**
       * 主窗口实例
       * @type {BrowserWindow}
       */
      this.mainWindow = appWindow
    }

    return windowName
  }

  /**
   * 创建应用窗口，所有可用的窗口初始化选项参考 @see https://electronjs.org/docs/api/browser-window#new-browserwindowoptions
   * @param {string} name 窗口名称，用户内部查询窗口实例
   * @param {Object} options Electron 窗口初始化选项
   * @memberof AppRemote
   * @return {BrowserWindow} 创建的应用窗口实例
   */
  createWindow (name, options) {
    if (typeof name === 'object') {
      options = name
      // eslint-disable-next-line prefer-destructuring
      name = options.name
    }

    options = Object.assign({
      name,
      showAfterLoad: true,
      hashRoute: `/${name}`,
      url: 'index.html',
      autoHideMenuBar: !IS_MAC_OSX,
      backgroundColor: '#ffffff',
      show: DEBUG, // eslint-disable-line
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true
      }
    }, options)

    let browserWindow = this.windows[name]
    if (browserWindow) {
      throw new Error(`The window with name '${name}' has already be created.`)
    }

    const windowSetting = Object.assign({}, options)
    let opts = ['url', 'showAfterLoad', 'debug', 'hashRoute', 'onLoad', 'beforeShow', 'afterShow', 'onClosed']
    opts.forEach(optionName => {
      delete windowSetting[optionName]
    })

    browserWindow = new BrowserWindow(windowSetting)

    if (DEBUG) { // eslint-disable-line
      console.log(`>> Create window "${name}" with setting: `, windowSetting)
    }

    this.windows[name] = browserWindow
    browserWindow.on('closed', () => {
      delete this.windows[name]
      if (options.onClosed) {
        options.onClosed(name)
      }
      this.tryQuiteOnAllWindowsClose()
    })

    browserWindow.webContents.on('did-finish-load', () => {
      if (options.showAfterLoad) {
        if (options.beforeShow) {
          options.beforeShow(browserWindow, name)
        }
        browserWindow.show()
        browserWindow.focus()
        if (options.afterShow) {
          options.afterShow(browserWindow, name)
        }
      }
      if (options.onLoad) {
        options.onLoad(browserWindow)
      }
    })

    // 阻止应用窗口导航到其他地址
    browserWindow.webContents.on('will-navigate', event => {
      event.preventDefault()
    })

    // 阻止应用内的链接打开新窗口
    browserWindow.webContents.on('new-window', (event, url) => {
      browserWindow.webContents.send(EVENT.open_url, url)
      event.preventDefault()
    })

    let {url} = options
    if (url) {
      if (!url.startsWith('file://') && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = `file://${this.rootPath}/${options.url}`
      }

      if (DEBUG) { // eslint-disable-line
        url += url.includes('?') ? '&react_perf' : '?react_perf'
      }
      if (options.hashRoute) {
        url += `#${options.hashRoute}`
      }
      browserWindow.loadURL(url)
    }

    if (options.debug && DEBUG) { // eslint-disable-line
      browserWindow.webContents.openDevTools({mode: 'bottom'})
      browserWindow.webContents.on('context-menu', (e, props) => {
        const {x, y} = props
        Menu.buildFromTemplate([{
          label: Lang.inspect_element,
          click () {
            browserWindow.inspectElement(x, y)
          }
        }]).popup(browserWindow)
      })

      browserWindow.webContents.on('crashed', () => {
        const messageBoxOptions = {
          type: 'info',
          title: 'Renderer process crashed.',
          message: 'The renderer process has been crashed, you can reload or close it.',
          buttons: ['Reload', 'Close']
        }

        if (DEBUG) { // eslint-disable-line
          console.error(`\n>> ERROR: ${messageBoxOptions.message}`)
        }

        dialog.showMessageBox(messageBoxOptions, (index) => {
          if (index === 0) {
            browserWindow.reload()
          } else {
            browserWindow.close()
          }
        })
      })
    }

    return browserWindow
  }

  /**
   * 初始化通知栏图标功能
   * @memberof AppRemote
   * @param {string} [windowName='main'] 窗口名称
   * @return {void}
   */
  createTrayIcon (windowName = 'main') {
    if (!this._traysData) {
      /**
       * 所有窗口中通知栏图标管理器数据
       * @type {Object[]}
       */
      this._traysData = {}
    }

    // 尝试移除旧的图标
    this.removeTrayIcon(windowName)

    // 创建一个通知栏图标
    let trayImage
    if (IS_MAC_OSX) {
      trayImage = `${this.rootPath}/${this.appConfig.media['image.path']}tray-icon-16.png`
    } else {
      trayImage = `${this.rootPath}/${this.appConfig.media['image.path']}tray-icon-32.png`
    }
    const tray = new Tray(trayImage)

    // 设置通知栏图标右键菜单功能
    const trayContextMenu = Menu.buildFromTemplate([
      {
        label: Lang.tray_open,
        click: () => {
          this.showAndFocusWindow()
        }
      }, {
        label: Lang.tray_exit,
        click: () => {
          const browserWindow = this.windows[windowName]
          if (browserWindow) {
            browserWindow.webContents.send(EVENT.remote_app_quit, 'quit')
          }
        }
      }
    ])

    // 设置通知栏图标鼠标提示
    tray.setToolTip(Lang.title)

    // 绑定通知栏图标点击事件
    tray.on('click', () => {
      this.showAndFocusWindow(windowName)
    })

    // 绑定通知栏图标右键点击事件
    tray.on('right-click', () => {
      tray.popUpContextMenu(trayContextMenu)
    })

    this._traysData[windowName] = {
      /**
       * 通知栏图标管理器
       * @type {Tray}
       * @private
       */
      tray,

      /**
       * 通知栏图标闪烁计数器
       * @type {number}
       * @private
       */
      iconCounter: 0
    }

    /**
     * 通知栏图标图片缓存
     * @type {string[]}
     * @private
     */
    this._trayIcons = [
      nativeImage.createFromPath(`${this.rootPath}/${this.appConfig.media['image.path']}tray-icon-16.png`),
      nativeImage.createFromPath(`${this.rootPath}/${this.appConfig.media['image.path']}tray-icon-transparent.png`)
    ]
  }

  /**
   * 移除通知栏图标
   *
   * @param {string} windowName 窗口名称
   * @memberof AppRemote
   * @return {void}
   */
  removeTrayIcon (windowName) {
    if (this._traysData && this._traysData[windowName]) {
      const trayData = this._traysData[windowName]
      const {tray} = trayData
      if (tray) {
        tray.destroy()
      }
      trayData.tray = null
      delete this._traysData[windowName]
    }
  }

  /**
   * 显示并激活指定名称的窗口，如果不指定名称，则激活并显示主窗口
   *
   * @param {string} [windowName='main'] 窗口名称
   * @memberof AppRemote
   * @return {void}
   */
  showAndFocusWindow (windowName = 'main') {
    const browserWindow = this.windows[windowName]
    if (browserWindow) {
      if (browserWindow.isMinimized()) {
        browserWindow.restore()
      } else {
        browserWindow.show()
      }
      browserWindow.focus()
    }
  }

  /**
   * 关闭指定名称的窗口
   * @param {string} winName 窗口名称
   * @returns {boolean} 如果返回 `true` 则为关闭成功，否则为关闭失败（可能找不到指定名称的窗口）
   */
  closeWindow (winName) {
    // 移除窗口对应的通知栏图标
    // this.removeTrayIcon(winName)

    // 获取已保存的窗口对象
    const win = this.windows[winName]
    if (SHOW_LOG) console.log('>> closeWindow', winName)

    if (win) {
      // 将窗口标记为关闭，跳过询问用户关闭策略步骤
      if (!this.markClose) {
        this.markClose = {}
      }

      this.markClose[winName] = true
      win.close()

      return true
    }

    return false
  }

  /**
   * 尝试退出，如果所有窗口都被关闭
   *
   * @memberof AppRemote
   * @return {void}
   */
  tryQuiteOnAllWindowsClose () {
    let hasWindowOpen = false
    Object.keys(this.windows).forEach(windowName => {
      if (!hasWindowOpen && this.windows[windowName] && !this.markClose[windowName]) {
        hasWindowOpen = true
      }
    })

    if (SHOW_LOG) console.log('>> tryQuiteOnAllWindowsClose', hasWindowOpen)
    if (!hasWindowOpen) {
      this.quit()
    }
  }

  /**
   * 立即关闭并退出应用程序
   *
   * @memberof AppRemote
   * @return {void}
   */
  // eslint-disable-next-line class-methods-use-this
  quit () {
    if (SHOW_LOG) console.log('>> quit')

    try {
      globalShortcut.unregisterAll()
    } catch (_) {} // eslint-disable-line

    ElectronApp.quit()
  }

  /**
   * 创建应用菜单
   *
   * @memberof AppRemote
   * @return {void}
   */
  createAppMenu () {

  }

  /**
   * 获取当前激活的窗口
   * @memberof AppRemote
   * @type {BrowserWindow}
   */
  get currentFocusWindow () {
    const focusedWindowName = Object.keys(this.windows).find(winName => this.windows[winName].isFocused())
    return focusedWindowName ? this.windows[focusedWindowName] : (this.mainWindow || this.windows[Object.keys(this.windows)[0]])
  }
}

/**
 * Electron 主进程运行时管理类全局唯一实例
 * @type {AppRemote}
 */
const app = new AppRemote()

export default app
