/**
 * Single-tag install (host this file on the same origin as the widget app, or pass ?base=):
 *
 *   <script src="https://YOUR-HOST/chat-widget.js" async></script>
 *
 * If the script is on a different domain than the app, point the iframe at your app:
 *
 *   <script src="https://CDN/chat-widget.js?base=https%3A%2F%2FYOUR-HOST" async></script>
 *
 * Optional query params on this script URL: base, path, w, h, style, allow
 * Optional data-* on the script tag still work (data-embed-url, data-embed-path, etc.).
 */
(function () {
  var SCRIPT_NAME = 'chat-widget.js'

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
      iframe.src = origin + path
    }

    iframe.title = s.getAttribute('data-title') || 'Chat'
    iframe.width = params.get('w') || s.getAttribute('data-width') || '420'
    iframe.height = params.get('h') || s.getAttribute('data-height') || '640'
    iframe.setAttribute(
      'style',
      params.get('style') ||
        s.getAttribute('data-style') ||
        'position:fixed;right:0;bottom:0;border:0;background:transparent;z-index:2147483647;max-height:90vh',
    )
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
