import { defineComponent, PropType,computed, onMounted, ref, Slot } from "vue";
import { BlockResize } from "./modules/blockResizer/blockResize";
import { VisualEditorBlockData, VisualEditorConfig } from "./visualEditor.utils";

export const VisualEditorBlock = defineComponent({
  props: {
    block: { type: Object as PropType<VisualEditorBlockData>, required: true },
    config: { type: Object as PropType<VisualEditorConfig>, required: true },
    formData: { type: Object as PropType<Record<string, any>>, required: true },
    slots: {type: Object as PropType<Record<string, Slot | undefined>>, required: true},
    customProps: {type: Object as PropType<Record<string, any>>}
  },
  emits: ['update:modelValue'],
  setup(props) {
    const el = ref({} as HTMLDivElement)
    const classes = computed(() => [
      'visual-editor-block',
      {
        'visual-editor-block-focus': props.block.focus
      }
    ])
    const styles = computed(() => ({
      top: `${props.block.top}px`,
      left: `${props.block.left}px`,
      zIndex: props.block.zIndex
    }))
    onMounted(() => {
      // 添加组件的时候，自动居中
      const block = props.block
      if(block.adjustPosition) {
        const {offsetWidth, offsetHeight} = el.value
        block.left = block.left - offsetWidth/2
        block.top = block.top - offsetHeight/2
        block.height = offsetHeight
        block.width = offsetWidth
        block.adjustPosition = false
      }
    })
    return () => {
      const component = props.config.componentMap[props.block.componentKey]
      const formData = props.formData as Record<string, any>
      let render: any;
      /**
       * 在 注册组件时 就声明了一个 preview和render方法
       * 而不是在block中通过组件类型来渲染组件，这样的穷举方式扩展性不好
       * 把实际需要渲染的内容 放到整个组件外部，以函数的方式调用，传入对应的参数
       * 这样组件的内容，高度自定义，扩展性很高
       * 特别是自定义事件，通过参数的形式 Editor -> Block -> Component 在外面处理，
       * 组件内不处理业务逻辑，仅关注组件本身
       */

      // 如果有slotName 说明是自定义插槽 就从 Editor组件的插槽中去找
      if (!!props.block.slotName && !!props.slots[props.block.slotName]) {
        render = props.slots[props.block.slotName]!()
      } else {
        render = component.render({
          size: props.block.hasResize ? {
            width: props.block.width,
            height: props.block.height,
          } : {},
          props: props.block.props || {},
          model: Object.keys(component.model || {}).reduce((prev, propName) => {
            const modelName = !props.block.model ? null : props.block.model[propName]
            prev[propName] = {
              [propName === 'default' ? 'modelValue' : propName]: !!modelName ? formData[modelName] : null,
              [propName === 'default' ? 'onUpdate:modelValue' : 'onChange']: (val: any) => !!modelName && (formData[modelName] = val)
            }
            return prev
          }, {} as Record<string, any>),
          custom: (!props.block.slotName || !props.customProps) ? {} : (props.customProps[props.block.slotName] || {})
        })
      }

      const {width, height} = component.resize || {}

      return (
        <div class={classes.value} ref={el} style={styles.value}>
          {render}
          {!!props.block.focus && (!!width || !!height) && <BlockResize block={props.block} component={component}/>}
        </div>
      )
    }
  }
})