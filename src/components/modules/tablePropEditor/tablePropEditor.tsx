import { useModel } from "@/components/utils/useModel";
import { VisualEditorProps } from "@/components/visualEditor.props";
import { ElButton, ElTag } from "element-plus";
import { defineComponent, PropType } from "vue";
import { $$tablePropEditor } from "./tablePropEditService";

export const TablePropEditor = defineComponent({
  props: {
    modelValue: {type: Array as PropType<any[]>},
    propConfig: {type: Object as PropType<VisualEditorProps>, required: true}
  },
  emits: {
    'update:modelValue': (val?: any[]) => true
  },
  setup(props, ctx) {
    const model = useModel(() => props.modelValue, val => ctx.emit('update:modelValue', val))

    const onClick = async () => {
      console.log('click')
      const data = await $$tablePropEditor({
        config: props.propConfig,
        data: props.modelValue || []
      })
      model.value = data
    }

    return () => (
      <div>
        {(!model.value || model.value.length === 0) && <ElButton size="small" {...{onClick}}>
          添加
        </ElButton>}
        {(model.value || []).map(item => (<ElTag>
          {item[props.propConfig.table!.showKey]}
        </ElTag>))}
      </div>
    )
  }
})