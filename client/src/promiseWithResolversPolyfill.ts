/**
 * pdfjs-dist (Viewer) und andere Libs nutzen Promise.withResolvers (ES2024).
 * In älteren Browsern / WebViews (z. B. iPad) fehlt das → Folien/PDF öffnen bricht ab.
 * Muss vor jedem Import von pdfjs geladen werden (siehe index.tsx).
 */
const P = Promise as typeof Promise & {
  withResolvers?: <T>() => {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
  };
};

if (typeof Promise !== 'undefined' && typeof P.withResolvers !== 'function') {
  P.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

/**
 * Vor pdf.worker.* als eigenes Skript einfügen (Web Worker = eigenes Promise).
 * ES5-syntax, keine Template-Literals.
 */
export const PROMISE_WITH_RESOLVERS_WORKER_IIFE =
  '(function(){if(typeof Promise.withResolvers!="function"){Promise.withResolvers=function(){var r,j,p=new Promise(function(a,b){r=a;j=b});return{promise:p,resolve:r,reject:j}};}})();';
