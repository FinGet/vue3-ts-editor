import { JSX_TYPES } from "@babel/types"
import { stringify } from "qs"
import { inject, provide } from "vue";
import { VisualEditorProps } from "./visualEditor.props"

export interface VisualEditorBlockData {
  componentKey: string,                           // 映射 VisualEditorConfig 中 componentMap 的 component对象
  top: number,                                    // 组件的top定位
  left: number,                                   // 组件的left定位
  adjustPosition: boolean,                        // 是否需要调整位置
  focus: boolean,                                 // 当前是否为选中状态
  zIndex: number,                                 // z-index值
  width: number,                                  // 组件宽度
  height: number,                                 // 组件高度
  hasResize: boolean,                             // 是否调整过宽度或者高度
  props: Record<string, any>,                     // 组件的设计属性
  model: Record<string, string>,                  // 绑定的字段
  slotName?: string,                              // 组件唯一标识
}

export interface VisualDragEvent {
  dragstart: {
    on: (cb: () => void) => void,
    off: (cb: () => void) => void,
    emit: () => void,
  },
  dragend: {
    on: (cb: () => void) => void,
    off: (cb: () => void) => void,
    emit: () => void,
  },
}
export interface VisualEditorModelValue {
  container: {
    width: number,
    height: number
  },
  blocks?: VisualEditorBlockData[]
}

export interface VisualEditorComponent {
  key: string,
  label: string,
  preview: () => JSX.Element | string,
  render: (data: {
    props: any,
    model: any,
    size: { width?: number, height?: number },
    custom: Record<string, any>
  }) => JSX.Element | string,
  props?: Record<string, VisualEditorProps>,
  model?: Record<string, string>,
  resize?: { width?: boolean, height?: boolean }
}

export interface VisualEditorMarkLines {
  x: { left: number, showLeft: number }[],
  y: { top: number, showTop: number }[]
}

export function createNewBlock(
  { top, left, component }: {
    component: null | VisualEditorComponent,
    top: number,
    left: number
  }): VisualEditorBlockData {
  return {
    top,
    left,
    componentKey: component!.key,
    adjustPosition: true,
    focus: false,
    zIndex: 0,
    width: 0,
    height: 0,
    hasResize: false,
    props: {},
    model: {},
  }
}
export const VisualDragProvider = (() => {
  const VISUAL_DRAG_PROVIDER = '@@VISUAL_DRAG_PROVIDER'
  return {
    provide: (data: VisualDragEvent) => {
      provide(VISUAL_DRAG_PROVIDER, data)
    },
    inject: () => {
      return inject(VISUAL_DRAG_PROVIDER) as VisualDragEvent
    },
  }
})();
export function createVisualEditorConfig() {
  const componentList: VisualEditorComponent[] = []
  const componentMap: Record<string, VisualEditorComponent> = {}
  return {
    componentList,
    componentMap,
    registry: <_,
      Props extends Record<string, VisualEditorProps> = {},
      Model extends Record<string, string> = {},
      >(key: string, component: {
        // key: string,
        label: string,
        preview: () => JSX.Element,
        render: (data: {
          props: { [k in keyof Props]: any },
          model: Partial<{ [k in keyof Model]: any }>,
          size: { width?: number, height?: number },
          custom: Record<string, any>
        }) => JSX.Element,
        props?: Props,
        model?: Model,
        resize?: { width?: boolean, height?: boolean }
      }) => {
      let comp = { ...component, key }
      componentList.push(comp)
      componentMap[key] = comp
    }
  }
}

export type VisualEditorConfig = ReturnType<typeof createVisualEditorConfig>