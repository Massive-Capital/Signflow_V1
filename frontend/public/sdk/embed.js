(function () {
  function open(opts) {
    if (!opts || !opts.documentId) {
      console.error('SignFlow.open requires documentId');
      return;
    }
    var mode = opts.mode === 'edit' ? 'builder' : 'sign';
    var base = window.location.origin.replace(/\/$/, '');
    var path =
      mode === 'builder'
        ? '/embed/documents/' + encodeURIComponent(opts.documentId) + '/builder'
        : '/embed/sign/' + encodeURIComponent(opts.documentId);
    var url = base + path;
    if (opts.apiKey) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + 'apiKey=' + encodeURIComponent(opts.apiKey);
    }
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.title = 'SignFlow';
    iframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483646;background:#fff;';
    iframe.dataset.signflowEmbed = '1';
    var close = function () {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      window.removeEventListener('message', onMessage);
    };
    var onMessage = function (event) {
      if (!event.data || event.data.source !== 'signflow-embed') return;
      if (event.data.event === 'completed' && typeof opts.onCompleted === 'function') {
        opts.onCompleted(event.data);
        close();
      }
    };
    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  }

  window.SignFlow = { open: open };
})();
