import { computed, defineComponent, ref, watch } from "vue";

/**
 * 自定义组件 实现 v-model
 * @param getter 
 * @param emitter 
 * @returns 
 */
export function useModel<T>(getter: () => T, emitter: (val: T) => void) {
  const state = ref(getter()) as {value: T}

  watch(getter, val => {
    if(val !== state.value) {
      state.value = val
    }
  })

  return computed({
    get: () => state.value,
    set: (val: T) => {
      if (state.value !== val) {
        state.value = val
        emitter(val)
      }
    }
  })
}

export const TestUseModel =  defineComponent({
  props: {
    modelValue: {
      type: String,
      default: ''
    }
  },
  setup(props, ctx) {
    const model = useModel(() => props.modelValue, (val) => ctx.emit('update:modelValue', val))
    return () => (
      <input v-model={model.value}></input>
    )
  }
})