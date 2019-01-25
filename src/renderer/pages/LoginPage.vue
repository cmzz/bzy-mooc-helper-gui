<template>
  <div id="wrapper" class="login-page">
    <main>
      <el-container>
        <el-main>
          <div class="brand align-center mt-80">
            <p class="title">请登录</p>
          </div>

          <div class="login-form mt-30">
            <el-form :model="ruleForm" :rules="rules" ref="ruleForm" label-width="100px">
              <el-form-item prop="username">
                <el-input placeholder="请输入登录账号" v-model="ruleForm.username">
                  <i slot="prefix" class="el-input__icon iconfont">&#xe730;</i>
                </el-input>
              </el-form-item>
              <el-form-item prop="password">
                <el-input type="password" placeholder="请输入登录密码" v-model="ruleForm.password">
                  <i slot="prefix" class="el-input__icon iconfont">&#xe620;</i>
                </el-input>
              </el-form-item>
              <el-form-item class="mt-40">
                <el-button class="login-btn" type="primary" @click="submitForm('ruleForm')">登录</el-button>

                <div class="align-center mt-30">
                  <el-button type="text" @click="open('http://google.com')">注册账号</el-button>
                  <el-button type="text" @click="open('http://google.com')">找回密码</el-button>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-main>

        <el-footer class="footer-copyright align-center">
          <el-button type="text" @click="open('http://google.com')">bzbs.app</el-button>
        </el-footer>
      </el-container>
    </main>
  </div>
</template>

<script>
  import pkg from '../../../package.json'

  export default {
    name: 'landing-page',
    data: () => {
      return {
        version: pkg.version,
        ruleForm: {
          username: '',
          password: ''
        },
        rules: {
          username: [
            {required: true, message: '请输入登录账号', trigger: 'blur'}
          ],
          password: [
            {required: true, message: '请输入登录密码', trigger: 'blur'}
          ]
        }
      }
    },
    components: { },
    methods: {
      open (link) {
        this.$electron.shell.openExternal(link)
      },
      submitForm (formName) {
        this.$refs[formName].validate((valid) => {
          if (valid) {
            this.$electron.ipcRenderer.send()
          } else {
            console.log('error submit!!')
            return false
          }
        })
      }
    },
    created: () => {
    }
  }
</script>



<style lang="less">
  .login-page {
    .login-form {
      width: 320px;
      margin: auto;

      .login-btn {
        width: 100%;
      }

      .el-form-item__content {
        margin-left: 0 !important;
      }
    }

    .footer-copyright {
      .el-button {
        span {
          color: #000;
          text-shadow: 1px 1px 1px #555;
        }
      }

      border-top: none;
      position: fixed;
      bottom: 0;
      width: 100%;
    }
  }
</style>
