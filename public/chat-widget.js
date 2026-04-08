/**
 * Single-tag install (host this file on the same origin as the widget app, or pass ?base=):
 *
 *   <script src="https://YOUR-HOST/chat-widget.js" crossorigin="anonymous" async></script>
 *
 * If the script is on a different domain than the app, point the iframe at your app:
 *
 *   <script src="https://CDN/chat-widget.js?base=https%3A%2F%2FYOUR-HOST" crossorigin="anonymous" async></script>
 *
 * Optional query params on this script URL:
 * base, path, w, h, bubble, style, allow, pattern, x, y, radius, shadow, ws, sessionApi
 * Optional data-* on the script tag still work (data-embed-url, data-embed-path, etc.).
 *
 * Open iframe size (w / h or data-width / data-height) must fit the whole widget:
 * panel (default 400×640) + right/bottom inset + gap + launcher button + shadows.
 * Defaults: 460×760px. If you pass 400×640 it is auto-expanded to that outer box.
 * Collapsed: bubble or data-bubble-size (default 112px).
 */
(function () {
  var SCRIPT_NAME = 'chat-widget.js'
  var DEFAULT_STYLE =
    'position:fixed;right:0;bottom:0;border:0;background:transparent;z-index:2147483647;max-height:90vh'

  var PATTERN_STYLES = {
    default: DEFAULT_STYLE,
    right: 'position:fixed;right:24px;bottom:24px;border:0;background:transparent;z-index:2147483647;max-height:90vh',
    left: 'position:fixed;left:24px;bottom:24px;border:0;background:transparent;z-index:2147483647;max-height:90vh',
    center:
      'position:fixed;left:50%;transform:translateX(-50%);bottom:24px;border:0;background:transparent;z-index:2147483647;max-height:90vh',
    inline:
      'position:relative;display:block;border:0;background:transparent;z-index:1;max-width:100%;max-height:none',
  }

  function findLoaderScript() {
    var scripts = document.getElementsByTagName('script')
    var i = scripts.length
    while (i--) {
      var el = scripts[i]
      var src = el.src || ''
      if (src.indexOf(SCRIPT_NAME) !== -1) return el
    }
    return null
  }

  function inject() {
    var s = findLoaderScript()
    if (!s || !s.src) return

    var scriptUrl = new URL(s.src, document.baseURI)
    var params = scriptUrl.searchParams

    var iframe = document.createElement('iframe')

    var fullUrl = s.getAttribute('data-embed-url')
    if (fullUrl) {
      iframe.src = fullUrl
    } else {
      var baseParam = params.get('base') || params.get('origin')
      var scriptOrigin = scriptUrl.origin
      var origin = baseParam
        ? baseParam.replace(/\/+$/, '')
        : s.getAttribute('data-embed-origin')
          ? s.getAttribute('data-embed-origin').replace(/\/+$/, '')
          : scriptOrigin

      var path =
        params.get('path') ||
        s.getAttribute('data-embed-path') ||
        '/embed/'
      if (!path.startsWith('/')) path = '/' + path
      if (!path.endsWith('/')) path += '/'
      var iframeUrl = new URL(origin + path)
      var ws = params.get('ws') || s.getAttribute('data-ws-url')
      var sessionApi =
        params.get('sessionApi') || s.getAttribute('data-session-api-url')
      if (ws) iframeUrl.searchParams.set('ws', ws)
      if (sessionApi) iframeUrl.searchParams.set('sessionApi', sessionApi)
      iframe.src = iframeUrl.toString()
    }

    iframe.title = s.getAttribute('data-title') || 'Chat'
    var pattern = (params.get('pattern') || s.getAttribute('data-pattern') || 'default').toLowerCase()
    var x = params.get('x') || s.getAttribute('data-offset-x')
    var y = params.get('y') || s.getAttribute('data-offset-y')
    var radius = params.get('radius') || s.getAttribute('data-radius')
    var shadow = params.get('shadow') || s.getAttribute('data-shadow')
    var customStyle = params.get('style') || s.getAttribute('data-style')

    if (customStyle) {
      iframe.setAttribute('style', customStyle)
    } else {
      var style = PATTERN_STYLES[pattern] || PATTERN_STYLES.default
      if (x) {
        if (pattern === 'left') {
          style += ';left:' + x
        } else if (pattern === 'center') {
          style += ';margin-left:' + x
        } else {
          style += ';right:' + x
        }
      }
      if (y) style += ';bottom:' + y
      if (radius) style += ';border-radius:' + radius + ';overflow:hidden'
      if (shadow) style += ';box-shadow:' + shadow
      iframe.setAttribute('style', style)
    }

    function ensurePx(value, fallback) {
      if (!value) return fallback
      return /^\d+$/.test(value) ? value + 'px' : value
    }

    function expandedDim(raw, fallback, minPx) {
      if (!raw || typeof raw !== 'string') return fallback
      var s = raw.trim().toLowerCase()
      if (s.indexOf('vw') !== -1 || s.indexOf('vh') !== -1 || s.indexOf('%') !== -1) {
        return fallback
      }
      var px = ensurePx(raw, fallback)
      var n = parseFloat(px)
      if (!n || n < minPx) return fallback
      return px
    }

    function applyAnchoring() {
      if (pattern === 'inline') return
      iframe.style.position = 'fixed'
      iframe.style.inset = 'auto'
      iframe.style.top = 'auto'
      iframe.style.bottom = y || '24px'
      if (pattern === 'left') {
        iframe.style.left = x || '24px'
        iframe.style.right = 'auto'
        iframe.style.transform = 'none'
      } else if (pattern === 'center') {
        iframe.style.left = '50%'
        iframe.style.right = 'auto'
        iframe.style.transform = 'translateX(-50%)'
      } else {
        iframe.style.right = x || '24px'
        iframe.style.left = 'auto'
        iframe.style.transform = 'none'
      }
    }

    var rawExpandedW = params.get('w') || s.getAttribute('data-width')
    var rawExpandedH = params.get('h') || s.getAttribute('data-height')
    var DEFAULT_OPEN_W = '460px'
    var DEFAULT_OPEN_H = '760px'
    var expandedWidth = expandedDim(rawExpandedW, DEFAULT_OPEN_W, 300)
    var expandedHeight = expandedDim(rawExpandedH, DEFAULT_OPEN_H, 380)

    var ew = parseFloat(expandedWidth)
    var eh = parseFloat(expandedHeight)
    if (ew === 400 && eh === 640) {
      expandedWidth = DEFAULT_OPEN_W
      expandedHeight = DEFAULT_OPEN_H
    }

    iframe.width = String(Math.max(1, Math.round(parseFloat(expandedWidth, 10) || 460)))
    iframe.height = String(Math.max(1, Math.round(parseFloat(expandedHeight, 10) || 760)))
    // Must fit launcher (56px) + horizontal inset (e.g. right-8 ≈ 32px) + shadow/badge bleed.
    // Smaller values clip the trigger (looks “sliced”) under overflow:hidden.
    var collapsedSize = ensurePx(
      params.get('bubble') || s.getAttribute('data-bubble-size'),
      '112px',
    )

    function setWidgetFrameOpen(isOpen) {
      if (pattern === 'inline') return
      applyAnchoring()
      iframe.style.width = isOpen ? expandedWidth : collapsedSize
      iframe.style.height = isOpen ? expandedHeight : collapsedSize
      iframe.style.maxHeight = isOpen ? '90vh' : collapsedSize
      iframe.style.transition = 'width 180ms ease,height 180ms ease'
      iframe.style.overflow = 'hidden'
    }

    setWidgetFrameOpen(false)

    window.addEventListener('message', function (event) {
      if (event.source !== iframe.contentWindow) return
      var data = event.data || {}
      if (data.source !== 'murphy-chat-widget' || data.type !== 'widget_state') return
      setWidgetFrameOpen(Boolean(data.isOpen))
    })

    var allow = params.get('allow') || s.getAttribute('data-allow')
    if (allow) iframe.setAttribute('allow', allow)

    document.body.appendChild(iframe)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject)
  } else {
    inject()
  }
})()
