import system from './system.json' // eslint-disable-line
import media from './media.json' // eslint-disable-line
import ui from './ui.json' // eslint-disable-line
import lang from './lang.json' // eslint-disable-line
import pkg from '../../package.json'

/**
 * 应用运行时配置
 * @type {Object}
 */
const config = {
  system,
  media,
  ui,
  pkg,
  exts: {},
  lang
}

/**
 * 更新应用运行时配置
 * @param {Object} newConfig 新的配置项
 * @return {Object} 应用运行时配置
 */
export const updateConfig = (newConfig) => {
  Object.keys(newConfig).forEach(key => {
    Object.assign(config[key], newConfig[key])
  })
  return config
}

// 从 package.json 文件中获取额外的运行时配置选项
const {configurations} = pkg
if (configurations) {
  updateConfig(configurations)
}

export default config
