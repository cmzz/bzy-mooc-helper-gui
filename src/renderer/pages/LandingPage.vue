<template>
  <div id="wrapper">
    <main>
      <el-container>
        <el-header>
          <img id="logo" src="~@/assets/logo.png" alt="electron-vue">
        </el-header>
        <el-main>
          <div class="brand">
            <p class="title">嗨，欢迎使用八爪博士网课助手!</p>
          </div>

          <el-row :gutter="20" class="align-center mt-60">
            <el-col :span="6"><div class="grid-content c-transparent">1</div></el-col>
            <el-col :span="6">
              <div class="grid-content platform-box">
                <p class="title">超星尔雅 (学习通)</p>
                <div class="platform-icon mt-20">
                  <i class="iconfont f-40">&#xe63c;</i>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="grid-content platform-box">
                <p class="title">智慧树网 (知到)</p>
                <div class="platform-icon mt-20">
                  <i class="iconfont f-40">&#xe6ba;</i>
                </div>
              </div>
            </el-col>
            <el-col :span="6"><div class="grid-content"> </div></el-col>
          </el-row>

        </el-main>
      </el-container>
      <el-footer>
        <div class="footer-menu align-right">
          <el-tag size="mini" :closable="false">Version: {{ version }}</el-tag>
        </div>
      </el-footer>
    </main>
  </div>
</template>

<script>
  import pkg from '../../../package.json'
  export default {
    name: 'landing-page',
    data: () => {
      return {
        'version': pkg.version
      }
    },
    components: { },
    methods: {
      open (link) {
        this.$electron.shell.openExternal(link)
      }
    },
    created: () => {
    }
  }
</script>

<style>
  #logo {
    height: 50px;
    width: auto;
  }

  .el-header {
    background: #323741;
    border-bottom: 1px solid #292D35;
    box-shadow:0 2px 4px #15171B;
  }

  .brand {
    text-align: center;
    margin-top: 50px;
  }

  .platform-box {
    border: 1px solid #2E3034;
    padding: 10px;
    -webkit-border-radius: 4px;
    -moz-border-radius: 4px;
    border-radius: 4px;
  }

  .platform-box:hover {
    background: #21293A;
    cursor: pointer;
  }

  .el-footer {
    border-top: 1px solid #131418;
    position: fixed;
    bottom: 0;
    width: 100%;
    background: #34373F;
    height: 32px !important;
    padding: 4px 10px 4px 10px !important;
  }

  .el-footer .el-tag {
    background: #3F4554 !important;
    color: #FCFCFC;
    border: none;
  }
</style>
