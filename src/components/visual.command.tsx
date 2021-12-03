import { useCommander } from "@/components/plugins/command.plugin";
import { VisualEditorBlockData, VisualEditorModelValue } from "./visualEditor.utils";
import deepcopy from "deepcopy";
export function useVisualCommand({
  focusData,
  updateBlocks,
  dataModel,
  dragstart,
  dragend
}: {
  focusData: { value: { focus: VisualEditorBlockData[], unFocus: VisualEditorBlockData[] } },
  updateBlocks: (blocks?: VisualEditorBlockData[]) => void,
  dataModel: { value: VisualEditorModelValue },
  dragstart: { on: (cb: () => void) => void, off: (cb: () => void) => void },
  dragend: { on: (cb: () => void) => void, off: (cb: () => void) => void },
}) {
  const commander = useCommander()

  // 删除就是只留下未focus的block
  commander.registry({
    name: 'delete',
    keyboard: ['backspace', 'ctrl+d', 'delete'],
    execute: () => {
      let data = {
        before: dataModel.value.blocks,
        after: focusData.value.unFocus,
      }
      return {
        redo: () => {
          // console.log('重做删除命令')
          updateBlocks(deepcopy(data.after))
        },
        undo: () => {
          // console.log('撤回删除命令')
          updateBlocks(deepcopy(data.before))
        },

      }
    }
  })

  commander.registry({
    name: 'drag',
    /**
     * 这个init 会在注册命令时执行，它的作用是注册两个监听事件(dragstart,dragend)
     * dragstart 是 一个函数，作用是记录当前状态(blocks)
     * dragend 也是一个函数，就是调用drag命令也就是redo，把拖拽后的状态也存下来
     * 这里使用this.data来存before 在 execute中才能取到,this指向的就是drag命令(command.init())
     * 
     * init执行之后，在合适的地方emit事件，就可以触发对应的方法，实现拖拽的撤销和重做
     */
    init() {
      this.data = { before: null as null | VisualEditorBlockData[], }
      const handler = {
        dragstart: () => this.data.before = deepcopy(dataModel.value.blocks),
        dragend: () => commander.state.commands.drag()
      }
      dragstart.on(handler.dragstart)
      dragend.on(handler.dragend)
      return () => {
        dragstart.off(handler.dragstart)
        dragstart.off(handler.dragend)
      }
    },
    execute() {
      let before = deepcopy(this.data.before)
      let after = deepcopy(dataModel.value.blocks)

      return {
        redo: () => {
          updateBlocks(deepcopy(after))
        },
        undo: () => {
          updateBlocks(deepcopy(before))
        },
      }
    }
  })

  commander.registry({
    name: 'clear',
    execute() {
      let before = deepcopy(dataModel.value.blocks)

      return {
        redo: () => {
          updateBlocks()
        },
        undo: () => {
          updateBlocks(deepcopy(before))
        },
      }
    }
  })

  commander.registry({
    name: 'placeTop',
    keyboard: 'ctrl+up',
    execute: () => {
      let data = {
        before: deepcopy(dataModel.value.blocks),
        after: deepcopy((() => {
          const { focus, unFocus } = focusData.value
          // 把选中的 block的 zIndex 都有置顶
          const maxZIndex = unFocus.reduce((prev, block) => Math.max(prev, block.zIndex), -Infinity) + 1
          focus.forEach(block => block.zIndex = maxZIndex)
          return deepcopy(dataModel.value.blocks)
        })()),
      }
      return {
        redo: () => {
          updateBlocks(deepcopy(data.after))
        },
        undo: () => {
          updateBlocks(deepcopy(data.before))
        },
      }
    }
  })
  commander.registry({
    name: 'placeBottom',
    keyboard: 'ctrl+down',
    execute: () => {
      let data = {
        before: deepcopy(dataModel.value.blocks),
        after: deepcopy((() => {
          const { focus, unFocus } = focusData.value
          let minZIndex = unFocus.reduce((prev, block) => Math.min(prev, block.zIndex), Infinity) - 1
          if (minZIndex < 0) {
            const dur = Math.abs(minZIndex)
            unFocus.forEach(block => block.zIndex += dur)
            minZIndex = 0
          }
          focus.forEach(block => block.zIndex = minZIndex)
          return deepcopy(dataModel.value.blocks)
        })()),
      }
      return {
        redo: () => {
          updateBlocks(deepcopy(data.after))
        },
        undo: () => {
          updateBlocks(deepcopy(data.before))
        },
      }
    }
  })

  commander.registry({
    name: 'updateBlock',
    execute: (newBlock: VisualEditorBlockData, oldBlock: VisualEditorBlockData) => {
      let blocks = deepcopy(dataModel.value.blocks || [])
      let data = {
        before: deepcopy(dataModel.value.blocks),
        after: (() => {
          blocks = [...blocks]
          const index = dataModel.value.blocks!.indexOf(oldBlock)
          // 新旧节点替换
          if (index > -1) {
            blocks.splice(index, 1, newBlock)
          }
          return deepcopy(blocks)
        })()
      }
      return {
        redo: () => {
          updateBlocks(deepcopy(data.after))
        },
        undo: () => {
          updateBlocks(deepcopy(data.before))
        },
      }
    }
  })
  commander.registry({
    name: 'updateModelValue',
    execute: (val: VisualEditorModelValue) => {
      let data = {
        before: deepcopy(dataModel.value),
        after: deepcopy(val),
      }
      return {
        redo: () => {
          dataModel.value = data.after
        },
        undo: () => {
          dataModel.value = data.before
        },
      }
    }
  })

  commander.init()
  return {
    undo: () => commander.state.commands.undo(),
    redo: () => commander.state.commands.redo(),
    delete: () => commander.state.commands.delete(),
    drag: () => commander.state.commands.drag(),
    clear: () => commander.state.commands.clear(),
    placeTop: () => commander.state.commands.placeTop(),
    placeBottom: () => commander.state.commands.placeBottom(),
    updateBlock: (data: VisualEditorBlockData, block: VisualEditorBlockData) => commander.state.commands.updateBlock(data, block),
    updateModelValue: (val: VisualEditorModelValue) => commander.state.commands.updateModelValue(val)
  }
}