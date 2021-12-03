import './visualEditor.scss'
import { computed, defineComponent, PropType, reactive, ref } from "vue";
import { createNewBlock, VisualEditorBlockData, VisualEditorComponent, VisualEditorConfig, VisualEditorModelValue, VisualEditorMarkLines, VisualDragProvider } from './visualEditor.utils';
import { useModel } from './utils/useModel';
import { VisualEditorBlock } from './visualEditorBlock';
import { VisualEditorOperator } from './visualEditorOperator';
import { useVisualCommand } from './visual.command';
import { createEvent } from './plugins/event';
import { $$dialog } from './utils/dialogService';
import { ElMessageBox } from 'element-plus';
import { $$dropdown, DropdownOption } from './utils/dropdownService';
import '../visual.config.scss'
export const VisualEditor = defineComponent({
  props: {
    modelValue: { type: Object as PropType<VisualEditorModelValue>, required: true },
    config: { type: Object as PropType<VisualEditorConfig>, required: true },
    formData: { type: Object as PropType<Record<string, any>>, required: true },
    customProps: {type: Object as PropType<Record<string, any>>}
  },

  setup(props, ctx) {
    /*双向绑定至，容器中的组件数据*/
    const dataModel = useModel(() => props.modelValue, (val) => ctx.emit('update:modelValue', val))
    /*container节点dom对象的引用*/
    const containerRef = ref({} as HTMLDivElement)
    /*container节点的style样式对象*/
    const containerStyle = computed(() => ({
      width: `${dataModel.value?.container.width}px`,
      height: `${dataModel.value?.container.height}px`
    }))
    /*计算选中与未选择的block数据  */
    const focusData = computed(() => {
      let focus: VisualEditorBlockData[] = []
      let unFocus: VisualEditorBlockData[] = [];
      dataModel.value.blocks?.forEach(block => (block.focus ? focus : unFocus).push(block))
      return {
        focus,
        unFocus
      }
    })
    const selectIndex = ref(-1) // 存选中的下标，存selectBlock 会导致拖拽后找不到之前的block，因为deepcopy了一份
    const state = reactive({
      selectBlock: computed(() => (dataModel.value.blocks || [])[selectIndex.value]),
      preview: false,          // 当前是否正在预览
      editing: true,           // 当前是否已经开启了编辑器
    })
    const classes = computed(() => [
      'visual-editor',
      {
        'visual-editor-not-preview': !state.preview,
      }
    ])

    /*对外暴露的一些方法*/
    const methods = {
      openEdit: () => state.editing = true,
      clearFocus: (block?: VisualEditorBlockData) => {
        let blocks = (dataModel.value.blocks || []);
        if (blocks.length === 0) return
        if (!!block) {
          blocks = blocks.filter(item => item !== block)
        }
        blocks.forEach(block => block.focus = false)
      },
      updateBlocks: (blocks?: VisualEditorBlockData[]) => {
        dataModel.value = { ...dataModel.value, blocks }
      },
      showBlockData: (block: VisualEditorBlockData) => {
        $$dialog.textarea(JSON.stringify(block), '节点数据', { editReadonly: true })
      },
      importBlockData: async (block: VisualEditorBlockData) => {
        const text = await $$dialog.textarea('', '请输入节点Json字符串')
        try {
          const data = JSON.parse(text || '')
          commander.updateBlock(data, block)
        } catch (e) {
          console.error(e)
          ElMessageBox.alert('解析json字符串出错')
        }
      },
    }
    
    const dragstart = createEvent()
    const dragend = createEvent()
    VisualDragProvider.provide({dragstart, dragend})
    /**
     *  - DataTransfer 对象：退拽对象用来传递的媒介，使用一般为Event.dataTransfer。
        - draggable 属性：就是标签元素要设置draggable=true，否则不会有效果，例如：
          <div title="拖拽我" draggable="true">列表1</div>
        - ondragstart 事件：当拖拽元素开始被拖拽的时候触发的事件，此事件作用在被拖曳元素上
        - ondragenter 事件：当拖曳元素进入目标元素的时候触发的事件，此事件作用在目标元素上
        - ondragover 事件：拖拽元素在目标元素上移动的时候触发的事件，此事件作用在目标元素上
        - ondrop 事件：被拖拽的元素在目标元素上同时鼠标放开触发的事件，此事件作用在目标元素上
        - ondragend 事件：当拖拽完成后触发的事件，此事件作用在被拖曳元素上
        - Event.preventDefault() 方法：阻止默认的些事件方法等执行。在ondragover中一定要执行preventDefault()，否则ondrop事件不会被触发。另外，如果是从其他应用软件或是文件中拖东西进来，尤其是图片的时候，默认的动作是显示这个图片或是相关信息，并不是真的执行drop。此时需要用用document的ondragover事件把它直接干掉。
        - Event.effectAllowed 属性：就是拖拽的效果。
     */
    /**处理menu拖拽相关的动作 */
    const menuDraggier = (() => {
      let component = null as null | VisualEditorComponent
      const blockHandler = {
        dragstart: (e: DragEvent, current: VisualEditorComponent) => {
          containerRef.value.addEventListener('dragenter', containerHandler.dragenter)
          containerRef.value.addEventListener('dragover', containerHandler.dragover)
          containerRef.value.addEventListener('dragleave', containerHandler.dragleave)
          containerRef.value.addEventListener('drop', containerHandler.drop)
          component = current
          dragstart.emit()
        },
        dragend: () => {
          // 拖拽完成 清除监听事件
          containerRef.value.removeEventListener('dragenter', containerHandler.dragenter)
          containerRef.value.removeEventListener('dragover', containerHandler.dragover)
          containerRef.value.removeEventListener('dragleave', containerHandler.dragleave)
          containerRef.value.removeEventListener('drop', containerHandler.drop)
          component = null
        },
      }
      const containerHandler = {
        /*拖拽菜单组件，进入容器的时候，设置鼠标为可放置状态*/
        dragenter: (e: DragEvent) => {
          /** 属性控制在拖放操作中给用户的反馈
           * copy 在新位置生成源项的副本
           * move 将项目移动到新位置
           * link 在新位置建立源项目的链接
           * none 项目可能禁止拖放
           */
          e.dataTransfer!.dropEffect = 'move'
        },
        /*拖拽菜单组件，鼠标在容器中移动的时候，禁用默认事件*/
        dragover: (e: DragEvent) => {
          // 在ondragover中一定要执行preventDefault()，否则ondrop事件不会被触发。
          e.preventDefault()
        },
        /*如果拖拽过程中，鼠标离开了容器，设置鼠标为不可放置的状态*/
        dragleave: (e: DragEvent) => e.dataTransfer!.dropEffect = 'none',
        /*子啊容器中放置的时候，事件对象的 offsetX，和offsetY添加一条组件数据*/
        drop: (e: DragEvent) => {
          const blocks = dataModel.value.blocks || []
          blocks.push(createNewBlock({
            top: e.offsetY,
            left: e.offsetX,
            component
          }))
          methods.updateBlocks(blocks)
          dragend.emit()
        }
      }
      return blockHandler
    })()
    /**处理block拖拽相关的动作 */
    const blockDraggier = (() => {
      const mark = reactive({
        x: null as null | number,
        y: null as null | number,
      })
      let dragState = {
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        startPos: [] as { left: number, top: number }[],
        dragging: false,
        markLines: {} as VisualEditorMarkLines
      }
      /**
       * block 的拖拽不能使用 drag 事件，因为mouse拖拽的时候还可以滚动滚动条
       */

      const mousedown = (e: MouseEvent) => {
        dragState = {
          startX: e.clientX,
          startY: e.clientY,
          startLeft: state.selectBlock!.left,
          startTop: state.selectBlock!.top,
          startPos: focusData.value.focus.map(({ top, left }) => ({ top, left })),
          dragging: false,
          markLines: (() => {
            const {unFocus } = focusData.value
            const { width, height } = state.selectBlock!
            let lines: VisualEditorMarkLines = { x: [], y: [] }
            // push container 是为了实现与画布的居中
            const _s = [...unFocus, {
              top: 0,
              left: 0,
              width: dataModel.value.container.width,
              height: dataModel.value.container.height,
            }]
            _s.forEach(block => {
              const { top: t, left: l, width: w, height: h } = block
              lines.y.push({ top: t, showTop: t })                              // 顶部对其顶部
              lines.y.push({ top: t + h, showTop: t + h })                      // 顶部对其底部
              lines.y.push({ top: t + h / 2 - height / 2, showTop: t + h / 2 }) // 中间对其中间（垂直）
              lines.y.push({ top: t - height, showTop: t })                     // 底部对其顶部
              lines.y.push({ top: t + h - height, showTop: t + h })             // 底部对其底部

              lines.x.push({ left: l, showLeft: l })                             // 顶部对其顶部
              lines.x.push({ left: l + w, showLeft: l + w })                     // 顶部对其底部
              lines.x.push({ left: l + w / 2 - width / 2, showLeft: l + w / 2 }) // 中间对其中间（垂直）
              lines.x.push({ left: l - width, showLeft: l })                     // 底部对其顶部
              lines.x.push({ left: l + w - width, showLeft: l + w })             // 底部对其底部
            })
            return lines
          })()
        }
        // console.log(dragState.markLines)
        document.addEventListener('mousemove', mousemove)
        document.addEventListener('mouseup', mouseup)
      }
      const mousemove = (e: MouseEvent) => {
        if (!dragState.dragging) {
          dragState.dragging = true
          dragstart.emit()
        }

        let { clientX: moveX, clientY: moveY } = e
        const { startX, startY } = dragState

        // 按住shift 实现 x 和 y的单一方向平移
        if (e.shiftKey) {
          if (Math.abs(moveX - startX) > Math.abs(moveY - startY)) {
            moveY = startY
          } else {
            moveX = startX
          }
        }

        const currentLeft = dragState.startLeft + moveX - startX
        const currentTop = dragState.startTop + moveY - startY
        const currentMark = {
          x: null as null | number,
          y: null as null | number
        }
        for (let i = 0; i < dragState.markLines.y.length; i++) {
          const { top, showTop } = dragState.markLines.y[i];
          if (Math.abs(top - currentTop) < 5) {
            moveY = top + startY - dragState.startTop
            currentMark.y = showTop
            break
          }
        }

        for (let i = 0; i < dragState.markLines.x.length; i++) {
          const { left, showLeft } = dragState.markLines.x[i];
          if (Math.abs(left - currentLeft) < 5) {
            moveX = left + startX - dragState.startLeft
            currentMark.x = showLeft
            break
          }
        }
        mark.x = currentMark.x
        mark.y = currentMark.y

        let durx = moveX - startX
        let dury = moveY - startY
        focusData.value.focus.forEach((block, index) => {
          block.top = dragState.startPos[index].top + dury
          block.left = dragState.startPos[index].left + durx
        })
      }
      const mouseup = (e: MouseEvent) => {
        document.removeEventListener('mousemove', mousemove)
        document.removeEventListener('mouseup', mouseup)
        mark.x = null
        mark.y = null
        if (dragState.dragging) {
          dragend.emit()
        }
      }
      return {
        mousedown,
        mark
      }
    })()

    /**处理block选中相关的动作 */
    const focusHandler = (() => {
      return {
        container: {
          onMousedown(e: MouseEvent) {
            if (state.preview) return;
            e.preventDefault()
            if (e.currentTarget !== e.target) {
              return
            }
            if (!e.shiftKey) {
              /*点击空白处，清空所有选中的block*/
              methods.clearFocus()
              selectIndex.value = -1
            }
          }
        },
        block: {
          onMousedown(e: MouseEvent, block: VisualEditorBlockData, index: number) {
            if (state.preview) return;
            // e.stopPropagation()
            // e.preventDefault()
            if (e.shiftKey) {
              /*如果摁住了shift键，如果此时没有选中的block，就选中这个block，否则令这个block的选中状态去翻*/
              if (focusData.value.focus.length <= 1) {
                block.focus = true
              } else {
                block.focus = !block.focus
              }
            } else {
              /*如果点击的这个block没有被选中，才清空这个其他选中的block，否则不做任何事情。放置拖拽多个block，取消其他block的选中状态*/
              if (!block.focus) {
                block.focus = true
                methods.clearFocus(block)
              }
            }
            selectIndex.value = index
            blockDraggier.mousedown(e)
          }
        }
      }
    })()

    /*其他的一些事件*/
    const handler = {
      onContextmenuBlock: (e: MouseEvent, block: VisualEditorBlockData) => {
        if (state.preview) return;
        e.preventDefault()
        e.stopPropagation()

        $$dropdown({
          reference: e,
          content: () => <>
            <DropdownOption label="置顶节点" icon="icon-place-top" {...{ onClick: commander.placeTop }} />
            <DropdownOption label="置底节点" icon="icon-place-bottom" {...{ onClick: commander.placeBottom }} />
            <DropdownOption label="删除节点" icon="icon-delete" {...{ onClick: commander.delete }} />
            <DropdownOption label="查看数据"
              icon="icon-browse" {...{ onClick: () => methods.showBlockData(block) }} />
            <DropdownOption label="导入节点"
              icon="icon-import" {...{ onClick: () => methods.importBlockData(block) }} />
          </>
        })
      },
    }
    const commander = useVisualCommand({
      focusData,
      updateBlocks: methods.updateBlocks,
      dataModel,
      dragstart,
      dragend
    })
    const buttons = [
      { label: '撤销', icon: 'icon-back', handler: commander.undo, tip: 'ctrl+z' },
      { label: '重做', icon: 'icon-forward', handler: commander.redo, tip: 'ctrl+y, ctrl+shift+z' },
      {
        label: () => state.preview ? '编辑' : '预览',
        icon: () => state.preview ? 'icon-edit' : 'icon-browse',
        handler: () => {
          if (!state.preview) {
            methods.clearFocus()
          }
          state.preview = !state.preview
        },
      },
      {
        label: '导入', icon: 'icon-import', handler: async () => {
          const text = await $$dialog.textarea('', '请输入倒入的JSON字符串')
          try {
            const data = JSON.parse(text || '')
            dataModel.value = data
          } catch (e) {
            console.error(e)
            ElMessageBox.alert('解析json字符串出错')
          }
        }
      },
      {
        label: '导出',
        icon: 'icon-export',
        handler: () => $$dialog.textarea(JSON.stringify(dataModel.value), '导出的JSON数据', { editReadonly: true })
      },
      { label: '置顶', icon: 'icon-place-top', handler: () => commander.placeTop(), tip: 'ctrl+up' },
      { label: '置底', icon: 'icon-place-bottom', handler: () => commander.placeBottom(), tip: 'ctrl+down' },
      { label: '删除', icon: 'icon-delete', handler: () => commander.delete(), tip: 'ctrl+d, backspace, delete' },
      { label: '清空', icon: 'icon-reset', handler: () => commander.clear(), },
      {
        label: '关闭', icon: 'icon-close', handler: () => {
          methods.clearFocus()
          state.editing = false
        },
      },
    ]
    return () => (
      <>
        <div class="visual-editor-container" style={containerStyle.value}>
          {!!dataModel.value.blocks && (
            dataModel.value.blocks.map((block, index) => (
              <VisualEditorBlock
                config={props.config}
                block={block}
                key={index}
                formData={props.formData}
                slots={ctx.slots}
                customProps={props.customProps}
              />
            ))
          )}
          <div class="vue-visual-container-edit-button" onClick={methods.openEdit}>
            <i class="iconfont icon-edit"/>
            <span>编辑组件</span>
          </div>
        </div>
        <div class={classes.value} v-show={state.editing}>
          <div class="visual-editor-menu">
            {props.config.componentList.map(component => (
              <div class="visual-editor-menu-item" draggable
                onDragend={menuDraggier.dragend}
                onDragstart={(e) => menuDraggier.dragstart(e, component)}>
                <span class="visual-editor-menu-item-label">{component.label}</span>
                {component.preview()}
              </div>
            ))}
          </div>
          <div class="visual-editor-head">
            {buttons.map((btn, index) => {
              const label = typeof btn.label === "function" ? btn.label() : btn.label
              const icon = typeof btn.icon === "function" ? btn.icon() : btn.icon
              const content = (<div key={index} class="visual-editor-head-button" onClick={btn.handler}>
                <i class={`iconfont ${icon}`} />
                <span>{label}</span>
              </div>)
              return !btn.tip ? content : <el-tooltip effect="dark" content={btn.tip} placement="bottom">
                {content}
              </el-tooltip>
            }
            )}
          </div>
          <VisualEditorOperator
            block={state.selectBlock}
            config={props.config}
            dataModel={dataModel}
            updateBlock={commander.updateBlock}
            updateModelValue={commander.updateModelValue} />

          <div class="visual-editor-body">
            <div class="visual-editor-content">
              <div class="visual-editor-container"
                ref={containerRef}
                style={containerStyle.value}
                {...focusHandler.container}
              >
                {
                  dataModel.value?.blocks?.map((block, index) => (
                    <VisualEditorBlock
                      config={props.config}
                      block={block}
                      key={index}
                      formData={props.formData}
                      slots={ctx.slots}
                      customProps={props.customProps}
                      {...{
                        onMousedown: (e: MouseEvent) => focusHandler.block.onMousedown(e, block, index),
                        onContextmenu: (e: MouseEvent) => handler.onContextmenuBlock(e, block)
                      }}
                    />
                  ))
                }

                {blockDraggier.mark.y !== null && (
                  <div class="visual-editor-mark-line-y" style={{ top: `${blockDraggier.mark.y}px` }} />
                )}
                {blockDraggier.mark.x !== null && (
                  <div class="visual-editor-mark-line-x" style={{ left: `${blockDraggier.mark.x}px` }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }
})