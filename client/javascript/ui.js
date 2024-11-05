let _canvasFg = document.getElementById('fgCanvas')
let _canvasBg = document.getElementById('bgCanvas')
export const canvasFg = () => _canvasFg
export const canvasBg = () => _canvasBg

export const content = document.getElementById('content')

// Init global slider tracker
let currentSliderActive = null
document.addEventListener('mousemove', e => {
  if (currentSliderActive == null) return
  currentSliderActive.handleMouseMove(e)
})
const handleStopActiveSliderTrack = (e) => {
  if (currentSliderActive == null || e.type == "mousedown") return
  currentSliderActive.handleMouseLeave()
  currentSliderActive = null
}
document.addEventListener('mouseleave', handleStopActiveSliderTrack)
document.addEventListener('mouseup', handleStopActiveSliderTrack)
class Slider {
  constructor(element, MIN_VALUE = 0.0, MAX_VALUE = 1.0) {
    this.element = element
    this.elementFill = element.children[0]
    this.elementNotch = element.children[1]
    this.value = 0
    this.notifyValueChange = () => {}
    this.MIN_VALUE = MIN_VALUE
    this.MAX_VALUE = MAX_VALUE

    element.addEventListener('mousedown', e => {this.handleMouseDown(e)})
  }

  handleMouseMove(e) {
    let rect = this.element.getBoundingClientRect()
    let x = Math.floor(e.clientX - rect.left)
    let xClamp = Math.max(Math.min(this.element.clientWidth, x), 0)
    let value = (xClamp / this.element.clientWidth) * (this.MAX_VALUE - this.MIN_VALUE) + this.MIN_VALUE
    if ((this.MAX_VALUE - this.MIN_VALUE > 1) && (Math.floor(this.MAX_VALUE - this.MIN_VALUE) === this.MAX_VALUE - this.MIN_VALUE)) {
      // detect if value requires decimal precision
      value = Math.floor(value)
    }
    this.value = value
    this.elementNotch.style.marginLeft = `${xClamp}px`
    this.elementFill.style.right = `${rect.width - xClamp}px`
    this.notifyValueChange(this.value)
    e.preventDefault();
    return false
  }
  handleMouseDown(e) {
    if (currentSliderActive != null) currentSliderActive.handleMouseLeave()
    currentSliderActive = this
    this.handleMouseMove(e);
    e.preventDefault();
    return false
  }
  handleMouseLeave() {
    this.isHeld = false
  }
  setValue(val) {
    val = Math.min(Math.max(this.MIN_VALUE, val), this.MAX_VALUE) // clamp
    val = (val - this.MIN_VALUE) / (this.MAX_VALUE - this.MIN_VALUE) // normalize
    this.value = Math.min(this.element.clientWidth, val)
    let x = this.value * this.element.clientWidth
    this.elementNotch.style.marginLeft = `${x}px`
    this.elementFill.style.right = `${this.element.clientWidth - x}px`
  }
}

class Toggle {
  constructor(element, initDown = true, notifyValueChange = () => {}) {
    this.element = element
    this.down = initDown
    this.notifyValueChange = notifyValueChange
    this.element.className = `toggle ${initDown ? ' toggled' : ''}`
    element.addEventListener('mousedown', () => {this.handleDown()})
  }

  handleDown(down) {
    if (down !== undefined) this.down = down
    else this.down = !this.down

    this.element.className = `toggle ${this.down ? ' toggled' : ''}`
    this.notifyValueChange(this.down)
  }
}

export const sliderLineWidth = new Slider(document.getElementById('slider-line-width'), 1, 100)
export const sliderLabelLineWidth = document.getElementById('slider-label-line-width')
// export const colorOutline = document.getElementById('color-outline')

export const buttonClear = document.getElementById('button-clear')

export const colorPalette = document.getElementById('color-palette');

export function syncCanvasSize() {
  _canvasFg.width = _canvasFg.offsetWidth * 2
  _canvasFg.height = _canvasFg.offsetHeight * 2
  _canvasBg.width = _canvasBg.offsetWidth * 2
  _canvasBg.height = _canvasBg.offsetHeight * 2
}
