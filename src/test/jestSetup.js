import Enzyme, { shallow, render, mount, configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
const { JSDOM } = require('jsdom');

console.log('setupEnzyme');

configure({ adapter: new Adapter() });

// Make Enzyme functions available in all test files without importing
global.shallow = shallow;
global.render = render;
global.mount = mount;

const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
const { window } = jsdom;
window.Date = Date;

function copyProps(src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target)
  });
}

global.window = window;
global.document = window.document;
global.navigator = {
  userAgent: 'node.js'
};
global.requestAnimationFrame = function(callback) {
  return setTimeout(callback, 0);
};
global.cancelAnimationFrame = function(id) {
  clearTimeout(id);
};
copyProps(window, global);
