declare module 'gsap' {
  interface GSAPUtils {
    toArray<T = HTMLElement>(targets: any): T[];
    [key: string]: any;
  }

  interface GSAPStatic {
    to(targets: any, vars: any): any;
    from(targets: any, vars: any): any;
    fromTo(targets: any, fromVars: any, toVars: any): any;
    set(targets: any, vars: any): any;
    timeline(vars?: any): any;
    registerPlugin(...plugins: any[]): void;
    context(func: () => void, scope?: any): { revert(): void; [key: string]: any };
    utils: GSAPUtils;
    [key: string]: any;
  }

  const gsap: GSAPStatic;
  export { gsap };
  export default gsap;
}

declare module 'gsap/ScrollTrigger' {
  const ScrollTrigger: any;
  export { ScrollTrigger };
  export default ScrollTrigger;
}

declare module 'gsap/ScrollToPlugin' {
  const ScrollToPlugin: any;
  export { ScrollToPlugin };
  export default ScrollToPlugin;
}
