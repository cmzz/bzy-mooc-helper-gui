'use strict'

import { app as ElectronApp } from 'electron'
import pkg from '../../package.json'
import fixPath from 'fix-path'
import application from '../utils/app-remote'

// 禁用自签发证书警告
ElectronApp.commandLine.appendSwitch('ignore-certificate-errors')

application.init(__dirname)

if (DEBUG && DEBUG !== 'production') { // eslint-disable-line
  // 启用 electron-debug https://github.com/sindresorhus/electron-debug
  require('electron-debug')() // eslint-disable-line global-require

  // 使得 app/node_modules 内的模块可以直接使用
  const path = require('path'); // eslint-disable-line
  const p = path.join(__dirname, '..', 'app', 'node_modules'); // eslint-disable-line
  require('module').globalPaths.push(p); // eslint-disable-line
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support') // eslint-disable-line
  sourceMapSupport.install()
}

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

if (process.env.DEBUG_ENV === 'debug') {
  global.__static = require('path').join(__dirname, '../../static').replace(/\\/g, '\\\\')
  require('electron-debug')() // eslint-disable-line global-require
}

// fix the $PATH in macOS
fixPath()

if (process.platform === 'win32') {
  ElectronApp.setAppUserModelId(pkg.build.appId)
}

ElectronApp.on('ready', function () {
  application.ready()
})

ElectronApp.on('window-all-closed', () => {
  try {
    ElectronApp.quit()
  } catch (_) {} // eslint-disable-line
})

ElectronApp.on('activate', () => {
  application.openOrCreateWindow()
  application.createAppMenu()
})
