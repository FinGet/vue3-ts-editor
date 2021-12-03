<template>
  <div>
    <visual-editor
      v-model="jsonData"
      :config="visualConf"
      :form-data="formData"
      :customProps="customProps"
    >
      <!-- <template #subBtn>
        <el-button v-if="formData.food === 'dangao'">自定义的按钮</el-button>
        <el-tag v-else>自定义的标签</el-tag>
      </template> -->
    </visual-editor>

    <!-- <TestUseModel v-model="value"/>
    {{value}} -->
    {{ formData }}
  </div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance, reactive, ref } from "vue";
import { VisualEditor } from "@/components/visualEditor";
// import {TestUseModel} from '@/components/utils/useModel'
import jsonData from "./data.json";
import { visualConf } from "./visual.config";
import { ElNotification } from "element-plus";
export default defineComponent({
  name: "App",
  components: {
    VisualEditor,
    // TestUseModel
  },
  setup() {
    const _this = getCurrentInstance()
    
    const formData = reactive({
      username: "admin",
      food: "",
      acctType: "",
    });
    const customProps = {
      subBtn: {
        onClick: () => {
          ElNotification.success({ message: "执行表单数据校验以及提交到服务器的动作" });
        },
      },
      mySelect: {
        onChange: (val: string) => {
          _this?.appContext.config.globalProperties.$message.success(`食物发生变化:${val}`)
          formData.acctType = '';
        },
      },
    };
    return {
      visualConf,
      jsonData,
      formData,
      customProps
    };
  },
});
</script>

<style lang="scss">
html,
body {
  margin: 0;
  padding: 0;
}
</style>
