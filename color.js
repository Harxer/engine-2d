// Color palette
let documentStyle = getComputedStyle(document.documentElement)
const COLOR = {
  BACKGROUND: documentStyle.getPropertyValue('--color-background'),
  FOREGROUND: documentStyle.getPropertyValue('--color-foreground'),
  TEXT: documentStyle.getPropertyValue('--color-text'),
  TONIC: documentStyle.getPropertyValue('--color-tonic'),
  MEDIANT: documentStyle.getPropertyValue('--color-mediant'),
  DOMINANT: documentStyle.getPropertyValue('--color-dominant'),
  ACCENT: documentStyle.getPropertyValue('--color-accent'),
  ACCENT_BACKUP: documentStyle.getPropertyValue('--color-accent-backup'),
  BLACK: 'rgb(0, 0, 0)',
  GREEN: 'rgb(0, 128, 0)',
  setRgbaAlpha: (rgba, alpha) => {
    if (rgba.lastIndexOf(',') == -1) return rgba
    alpha = (alpha == NaN) ? 1 : alpha || 1
    if ((rgba.match(/,/g) || []).length == 2) {
      return rgba.substring(0, rgba.lastIndexOf(')')) + `,${alpha})`
    }
    return rgba.substring(0, rgba.lastIndexOf(',')) + `,${alpha})`
  }

}

export default COLOR