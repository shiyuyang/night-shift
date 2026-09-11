import config from '../../vite.config.ts';
// A benchmark must never reload midway through a recorded run.
export default {...config,server:{...config.server,hmr:false,watch:null}};
