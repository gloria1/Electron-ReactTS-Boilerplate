(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(global, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*****************************!*\
  !*** ./src/main/preload.ts ***!
  \*****************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);
/* eslint-disable camelcase */
// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */

const electronHandler = {
    ipcRenderer: {
        sendMessage(channel, ...args) {
            electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.send(channel, args);
        },
        on: (channel, func) => {
            electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.on(channel, func);
        },
        off: (channel, func) => {
            electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.off(channel, func);
        },
        removeAllListeners: (channel) => {
            electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.removeAllListeners(channel);
        },
        listenerCount: (channel) => {
            return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.listenerCount(channel);
        },
        once: (channel, func) => {
            electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.once(channel, func);
        },
        invoke: async (channel, ...args) => {
            return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(channel, ...args);
        },
    },
};
electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('electron', electronHandler);

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDO0FBQ0QsTzs7Ozs7Ozs7OztBQ1ZBOzs7Ozs7VUNBQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7OztXQ3RCQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EsaUNBQWlDLFdBQVc7V0FDNUM7V0FDQTs7Ozs7V0NQQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLHlDQUF5Qyx3Q0FBd0M7V0FDakY7V0FDQTtXQUNBOzs7OztXQ1BBOzs7OztXQ0FBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RDs7Ozs7Ozs7Ozs7OztBQ05BLDhCQUE4QjtBQUM5QixpREFBaUQ7QUFDakQsZ0NBQWdDO0FBQ3dDO0FBK0N4RSxNQUFNLGVBQWUsR0FBb0I7SUFDdkMsV0FBVyxFQUFFO1FBQ1gsV0FBVyxDQUFDLE9BQWlCLEVBQUUsR0FBRyxJQUFlO1lBQy9DLGlEQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQsRUFBRSxFQUFFLENBQ0YsT0FBVSxFQUNWLElBR1MsRUFDVCxFQUFFO1lBQ0YsaURBQVcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCxHQUFHLEVBQUUsQ0FDSCxPQUFVLEVBQ1YsSUFHUyxFQUNULEVBQUU7WUFDRixpREFBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUVELGtCQUFrQixFQUFFLENBQXVDLE9BQVUsRUFBRSxFQUFFO1lBQ3ZFLGlEQUFXLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUVELGFBQWEsRUFBRSxDQUNiLE9BQVUsRUFDRixFQUFFO1lBQ1YsT0FBTyxpREFBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsSUFBSSxFQUFFLENBQ0osT0FBVSxFQUNWLElBR1MsRUFDVCxFQUFFO1lBQ0YsaURBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksRUFBRSxFQUFFO1lBQ2pDLE9BQU8saURBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDOUMsQ0FBQztLQUNGO0NBQ0YsQ0FBQztBQUVGLG1EQUFhLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vL3dlYnBhY2svdW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbiIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImVsZWN0cm9uXCIiLCJ3ZWJwYWNrOi8vL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovLy93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly8vd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovLy93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovLy93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovLy8uL3NyYy9tYWluL3ByZWxvYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHRlbHNlIHtcblx0XHR2YXIgYSA9IGZhY3RvcnkoKTtcblx0XHRmb3IodmFyIGkgaW4gYSkgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyA/IGV4cG9ydHMgOiByb290KVtpXSA9IGFbaV07XG5cdH1cbn0pKGdsb2JhbCwgKCkgPT4ge1xucmV0dXJuICIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImVsZWN0cm9uXCIpOyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCIvKiBlc2xpbnQtZGlzYWJsZSBjYW1lbGNhc2UgKi9cbi8vIERpc2FibGUgbm8tdW51c2VkLXZhcnMsIGJyb2tlbiBmb3Igc3ByZWFkIGFyZ3Ncbi8qIGVzbGludCBuby11bnVzZWQtdmFyczogb2ZmICovXG5pbXBvcnQgeyBJcGNSZW5kZXJlckV2ZW50LCBjb250ZXh0QnJpZGdlLCBpcGNSZW5kZXJlciB9IGZyb20gJ2VsZWN0cm9uJztcbmltcG9ydCB7IElQQ01ldGhvZHMgfSBmcm9tICdzaGFyZWQvSVBDL3R5cGVzL2NsaWVudFRvU2VydmVyJztcbmltcG9ydCB7IElQQ19QdXNoTm90aWZpY2F0aW9uIH0gZnJvbSAnc2hhcmVkL0lQQy90eXBlcy9zZXJ2ZXJUb0NsaWVudCc7XG5cbnR5cGUgQ2hhbm5lbHMgPSBrZXlvZiBJUENNZXRob2RzO1xuXG5leHBvcnQgaW50ZXJmYWNlIEVsZWN0cm9uSGFuZGxlciB7XG4gIGlwY1JlbmRlcmVyOiB7XG4gICAgc2VuZE1lc3NhZ2UoY2hhbm5lbDogQ2hhbm5lbHMsIC4uLmFyZ3M6IHVua25vd25bXSk6IHZvaWQ7XG5cbiAgICBvbjogPFQgZXh0ZW5kcyBrZXlvZiBJUENfUHVzaE5vdGlmaWNhdGlvbj4oXG4gICAgICBjaGFubmVsOiBULFxuICAgICAgZnVuYzogKFxuICAgICAgICBfZXZlbnQ6IElwY1JlbmRlcmVyRXZlbnQsXG4gICAgICAgIGFyZ3M6IElQQ19QdXNoTm90aWZpY2F0aW9uW1RdWydwYXlsb2FkJ11cbiAgICAgICkgPT4gdm9pZFxuICAgICkgPT4gdm9pZDtcblxuICAgIG9mZjogPFQgZXh0ZW5kcyBrZXlvZiBJUENfUHVzaE5vdGlmaWNhdGlvbj4oXG4gICAgICBjaGFubmVsOiBULFxuICAgICAgZnVuYzogKFxuICAgICAgICBfZXZlbnQ6IElwY1JlbmRlcmVyRXZlbnQsXG4gICAgICAgIGFyZ3M6IElQQ19QdXNoTm90aWZpY2F0aW9uW1RdWydwYXlsb2FkJ11cbiAgICAgICkgPT4gdm9pZFxuICAgICkgPT4gdm9pZDtcblxuICAgIHJlbW92ZUFsbExpc3RlbmVyczogPFQgZXh0ZW5kcyBrZXlvZiBJUENfUHVzaE5vdGlmaWNhdGlvbj4oXG4gICAgICBjaGFubmVsOiBUXG4gICAgKSA9PiB2b2lkO1xuXG4gICAgb25jZTogPFQgZXh0ZW5kcyBrZXlvZiBJUENfUHVzaE5vdGlmaWNhdGlvbj4oXG4gICAgICBjaGFubmVsOiBULFxuICAgICAgZnVuYzogKFxuICAgICAgICBfZXZlbnQ6IElwY1JlbmRlcmVyRXZlbnQsXG4gICAgICAgIGFyZ3M6IElQQ19QdXNoTm90aWZpY2F0aW9uW1RdWydwYXlsb2FkJ11cbiAgICAgICkgPT4gdm9pZFxuICAgICkgPT4gdm9pZDtcblxuICAgIGludm9rZTogPFQgZXh0ZW5kcyBDaGFubmVscz4oXG4gICAgICBjaGFubmVsOiBULFxuICAgICAgYXJnczogSVBDTWV0aG9kc1tUXVsncmVxdWVzdCddXG4gICAgKSA9PiBQcm9taXNlPElQQ01ldGhvZHNbVF1bJ3Jlc3BvbnNlJ10+O1xuXG4gICAgbGlzdGVuZXJDb3VudDogPFQgZXh0ZW5kcyBrZXlvZiBJUENfUHVzaE5vdGlmaWNhdGlvbj4oY2hhbm5lbDogVCkgPT4gbnVtYmVyO1xuICB9O1xufVxuXG5jb25zdCBlbGVjdHJvbkhhbmRsZXI6IEVsZWN0cm9uSGFuZGxlciA9IHtcbiAgaXBjUmVuZGVyZXI6IHtcbiAgICBzZW5kTWVzc2FnZShjaGFubmVsOiBDaGFubmVscywgLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICBpcGNSZW5kZXJlci5zZW5kKGNoYW5uZWwsIGFyZ3MpO1xuICAgIH0sXG5cbiAgICBvbjogPFQgZXh0ZW5kcyBrZXlvZiBJUENfUHVzaE5vdGlmaWNhdGlvbj4oXG4gICAgICBjaGFubmVsOiBULFxuICAgICAgZnVuYzogKFxuICAgICAgICBfZXZlbnQ6IElwY1JlbmRlcmVyRXZlbnQsXG4gICAgICAgIGFyZ3M6IElQQ19QdXNoTm90aWZpY2F0aW9uW1RdWydwYXlsb2FkJ11cbiAgICAgICkgPT4gdm9pZFxuICAgICkgPT4ge1xuICAgICAgaXBjUmVuZGVyZXIub24oY2hhbm5lbCwgZnVuYyk7XG4gICAgfSxcblxuICAgIG9mZjogPFQgZXh0ZW5kcyBrZXlvZiBJUENfUHVzaE5vdGlmaWNhdGlvbj4oXG4gICAgICBjaGFubmVsOiBULFxuICAgICAgZnVuYzogKFxuICAgICAgICBfZXZlbnQ6IElwY1JlbmRlcmVyRXZlbnQsXG4gICAgICAgIGFyZ3M6IElQQ19QdXNoTm90aWZpY2F0aW9uW1RdWydwYXlsb2FkJ11cbiAgICAgICkgPT4gdm9pZFxuICAgICkgPT4ge1xuICAgICAgaXBjUmVuZGVyZXIub2ZmKGNoYW5uZWwsIGZ1bmMpO1xuICAgIH0sXG5cbiAgICByZW1vdmVBbGxMaXN0ZW5lcnM6IDxUIGV4dGVuZHMga2V5b2YgSVBDX1B1c2hOb3RpZmljYXRpb24+KGNoYW5uZWw6IFQpID0+IHtcbiAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUFsbExpc3RlbmVycyhjaGFubmVsKTtcbiAgICB9LFxuXG4gICAgbGlzdGVuZXJDb3VudDogPFQgZXh0ZW5kcyBrZXlvZiBJUENfUHVzaE5vdGlmaWNhdGlvbj4oXG4gICAgICBjaGFubmVsOiBUXG4gICAgKTogbnVtYmVyID0+IHtcbiAgICAgIHJldHVybiBpcGNSZW5kZXJlci5saXN0ZW5lckNvdW50KGNoYW5uZWwpO1xuICAgIH0sXG5cbiAgICBvbmNlOiA8VCBleHRlbmRzIGtleW9mIElQQ19QdXNoTm90aWZpY2F0aW9uPihcbiAgICAgIGNoYW5uZWw6IFQsXG4gICAgICBmdW5jOiAoXG4gICAgICAgIF9ldmVudDogSXBjUmVuZGVyZXJFdmVudCxcbiAgICAgICAgYXJnczogSVBDX1B1c2hOb3RpZmljYXRpb25bVF1bJ3BheWxvYWQnXVxuICAgICAgKSA9PiB2b2lkXG4gICAgKSA9PiB7XG4gICAgICBpcGNSZW5kZXJlci5vbmNlKGNoYW5uZWwsIGZ1bmMpO1xuICAgIH0sXG5cbiAgICBpbnZva2U6IGFzeW5jIChjaGFubmVsLCAuLi5hcmdzKSA9PiB7XG4gICAgICByZXR1cm4gaXBjUmVuZGVyZXIuaW52b2tlKGNoYW5uZWwsIC4uLmFyZ3MpO1xuICAgIH0sXG4gIH0sXG59O1xuXG5jb250ZXh0QnJpZGdlLmV4cG9zZUluTWFpbldvcmxkKCdlbGVjdHJvbicsIGVsZWN0cm9uSGFuZGxlcik7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=