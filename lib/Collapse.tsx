import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import type { CollapseProps } from '../types/index.d.ts'

const COLLAPSED = 'collapsed'
const COLLAPSING = 'collapsing'
const EXPANDING = 'expanding'
const EXPANDED = 'expanded'

const defaultClassName = 'collapse-css-transition'
const defaultElementType = 'div'
const defaultCollapseHeight = '0px'

function nextFrame(callback: FrameRequestCallback) {
  requestAnimationFrame(function () {
    //setTimeout(callback, 0); // NOT used because can be jumpy if click-spamming.
    requestAnimationFrame(callback) // This is used.
  })
}

export default function Collapse({
  children,
  transition,
  style,
  render,
  elementType = defaultElementType,
  isOpen,
  collapseHeight = defaultCollapseHeight,
  onInit,
  onChange,
  className = defaultClassName,
  addState,
  noAnim,
  overflowOnExpanded,
  ...rest
}: CollapseProps) {
  let getCollapsedVisibility = () =>
    collapseHeight === '0px' ? 'hidden' : undefined

  let [__, forceUpdate] = useReducer((_) => _ + 1, 0)

  let elementRef = useRef()
  let [callbackTick, setCallbackTick] = useState(0)

  // Avoiding setState to control when stuff are updated.
  // Might not be needed.
  let state = useRef({
    collapse: isOpen ? EXPANDED : COLLAPSED,
    style: {
      height: isOpen ? undefined : collapseHeight,
      visibility: isOpen ? undefined : getCollapsedVisibility(),
    },
  }).current

  useEffect(() => {
    // Invoke callback when data are updated, use Effect to sync state.
    callbackTick && onCallback(onChange)
  }, [callbackTick])

  let onCallback = (callback, params = {}) => {
    if (callback) {
      callback({ state: state.collapse, style: state.style, ...params })
    }
  }

  function setCollapsed() {
    if (!elementRef.current) return // might be redundant

    // Update state
    state.collapse = COLLAPSED

    state.style = {
      height: collapseHeight,
      visibility: getCollapsedVisibility(),
    }
    forceUpdate()

    setTimeout(() => setCallbackTick(Date.now), 0) // callback and re-render
  }

  function setCollapsing() {
    if (!elementRef.current) return // might be redundant

    if (noAnim) {
      return setCollapsed()
    }

    // Update state
    state.collapse = COLLAPSING

    state.style = {
      height: getElementHeight(),
      visibility: undefined,
    }
    forceUpdate()

    nextFrame(() => {
      if (!elementRef.current) return
      if (state.collapse !== COLLAPSING) return

      state.style = {
        height: collapseHeight,
        visibility: undefined,
      }

      setCallbackTick(Date.now) // callback and re-render
    })
  }

  function setExpanding() {
    if (!elementRef.current) return // might be redundant

    if (noAnim) {
      return setExpanded()
    }

    // Updatetate
    state.collapse = EXPANDING

    nextFrame(() => {
      if (!elementRef.current) return // might be redundant
      if (state.collapse !== EXPANDING) return

      state.style = {
        height: getElementHeight(),
        visibility: undefined,
      }

      setCallbackTick(Date.now) // callback and re-render
    })
  }

  function setExpanded() {
    if (!elementRef.current) return // might be redundant

    // Update state
    state.collapse = EXPANDED

    state.style = {
      height: undefined,
      visibility: undefined,
    }
    forceUpdate()

    setTimeout(() => setCallbackTick(Date.now), 0) // callback and re-render
  }

  function getElementHeight() {
    // @ts-ignore
    return `${elementRef.current.scrollHeight}px`
  }

  function onTransitionEnd({ target, propertyName }) {
    if (target === elementRef.current && propertyName === 'height') {
      let styleHeight = target.style.height

      switch (state.collapse) {
        case EXPANDING:
          if (styleHeight === undefined || styleHeight === collapseHeight)
            // This is stale, a newer event has happened before this could execute
            console.warn(
              `onTransitionEnd height unexpected ${styleHeight}`,
              'ignore setExpanded'
            )
          else setExpanded()
          break
        case COLLAPSING:
          if (styleHeight === undefined || styleHeight !== collapseHeight)
            // This is stale, a newer event has happened before this could execute
            console.warn(
              `onTransitionEnd height unexpected ${styleHeight}`,
              'ignore setCollapsed'
            )
          else setCollapsed()
          break
        default:
          console.warn('Ignored in onTransitionEnd', state.collapse)
      }
    }
  }

  // getDerivedStateFromProps
  let didOpen = state.collapse === EXPANDED || state.collapse === EXPANDING

  if (!didOpen && isOpen) setExpanding()

  if (didOpen && !isOpen) setCollapsing()
  // END getDerivedStateFromProps

  let overflow =
    state.collapse === EXPANDED && overflowOnExpanded ? undefined : 'hidden'

  let computedStyle = {
    overflow,
    transition,
    ...style,
    ...state.style,
  }
  let ElementType = elementType

  let callbackRef = useCallback(
    (node) => {
      if (node) {
        elementRef.current = node
        onCallback(onInit, { node })
      }
    },
    [elementType]
  )

  let collapseClassName = addState
    ? `${className} --c-${state.collapse}`
    : className

  return (
    // @ts-ignore
    <ElementType
      ref={callbackRef}
      style={computedStyle}
      onTransitionEnd={onTransitionEnd}
      className={collapseClassName}
      {...rest}
    >
      {typeof children === 'function'
        ? children(state.collapse)
        : typeof render === 'function'
        ? render(state.collapse)
        : children}
    </ElementType>
  )
}
