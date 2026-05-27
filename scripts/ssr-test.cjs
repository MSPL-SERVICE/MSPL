const { JSDOM } = require('jsdom');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

// Initialize a minimal DOM
const dom = new JSDOM(`<!doctype html><html><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.navigator = { userAgent: 'node.js' };

// Provide atob for any base64 decoding used in component (though useEffect won't run)
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Mock URL.createObjectURL used in useEffect (not executed during SSR, but define to be safe)
global.URL = {
  createObjectURL: () => 'blob://mocked',
  revokeObjectURL: () => {}
};

// Render the DocumentViewer component to string
(async () => {
  try {
    const DocumentViewer = require('./DocumentViewer.cjs').default;
    const props = {
      name: 'sample-image.png',
      type: 'image/png',
      data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=',
      onClose: () => {}
    };

    const html = ReactDOMServer.renderToString(React.createElement(DocumentViewer, props));
    console.log('SSR render length:', html.length);
    console.log(html.slice(0, 500));
  } catch (err) {
    console.error('SSR render failed:', err);
  }
})();
