import { defineComponent } from 'vue';
import { useModel } from "@/components/utils/useModel";
import './numberRange.scss'

export const NumberRange = defineComponent({
  props: {
    start: { type: String },
    end: { type: String }
  },
  emits: {
    'update:start': (val?: string) => true,
    'update:end': (val?: string) => true,
  },
  setup(props, ctx) {

    const startModel = useModel(() => props.start, val => ctx.emit('update:start', val))
    const endModel = useModel(() => props.end, val => ctx.emit('update:end', val))

    return () => (
      <div class="number-range">
        <div><input type="text" v-model={startModel.value} /></div>
        <span>~</span>
        <div><input type="text" v-model={endModel.value} /></div>
      </div>
    )
  },
})