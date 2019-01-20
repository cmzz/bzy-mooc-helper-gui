'use strict'

import { app, BrowserWindow, Tray, Menu, Notification, clipboard, ipcMain, globalShortcut, dialog } from 'electron'
import pkg from '../../package.json'
import coreIpc from './utils/coreIPC'
import fixPath from 'fix-path'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}
if (process.env.DEBUG_ENV === 'debug') {
  global.__static = require('path').join(__dirname, '../../static').replace(/\\/g, '\\\\')
}

let mainWindow
let tray
let menu
let contextMenu
let io
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:19080`
  : `file://${__dirname}/index.html`

// fix the $PATH in macOS
fixPath()

if (process.platform === 'win32') {
  app.setAppUserModelId(pkg.build.appId)
}

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)
app.on('ready', () => {
  // 创建 socket.io server
  io = require('socket.io').listen(37108)

  io.on('connection', function (socket) {
    console.log('a user connected')
    socket.emit('news', { hello: 'world' })
    socket.on('my other event', function (data) {
      console.log(data)
    })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (io != null) {
      io.close()
    }
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
